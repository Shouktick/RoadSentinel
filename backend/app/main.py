import asyncio
import hashlib
import json
import logging
import os
import re
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from app.core.config import Settings
from app.database.store import Store
from app.schemas.scenario import Scenario, PredictionRequest, SweepRequest, WhatIfRequest
from app.services.batch import export_csv, infer_batch, read_csv
from app.services.dataset import DataUnavailable, DatasetService
from app.services.model import ModelService, ModelUnavailable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("roadsentinel.api")


class PayloadTooLarge(Exception):
    pass


class BodyLimit:
    def __init__(self, app, limit):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        count = 0

        async def bounded():
            nonlocal count
            message = await receive()
            count += len(message.get("body", b""))
            if count > self.limit:
                raise PayloadTooLarge()
            return message

        await self.app(scope, bounded, send)


def bearer(authorization: Annotated[str | None, Header()] = None):
    if not authorization or not re.fullmatch(r"Bearer [a-f0-9]{64}", authorization):
        raise HTTPException(401, "A browser session token is required.")
    return authorization[7:]


def create_app(settings=None, model_service=None):
    settings = settings or Settings()
    model = model_service or ModelService(settings)
    store = Store(settings.database_url)

    @asynccontextmanager
    async def lifespan(app):
        store.initialize()
        if model.model is None:
            await asyncio.to_thread(model.initialize)
        try:
            app.state.dataset = DatasetService(settings)
        except Exception:
            logger.exception("dataset_initialization_failed")
            app.state.dataset = DatasetService(Settings(dataset_path=None, dataset_manifest=None))
        yield
        store.engine.dispose()

    app = FastAPI(
        title="RoadSentinel API",
        version="2.0.0",
        lifespan=lifespan,
        description="Documented STATS19 injury severity estimates conditional on a recorded crash in Great Britain.",
    )
    app.state.model, app.state.store, app.state.settings = model, store, settings
    app.add_middleware(BodyLimit, limit=settings.max_upload_bytes + 65536)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    buckets = defaultdict(deque)

    def failure(request, status, code, message, details=None):
        return JSONResponse(
            status_code=status,
            content={
                "error": {
                    "code": code,
                    "message": message,
                    "request_id": getattr(request.state, "request_id", "unknown"),
                    "details": details,
                }
            },
        )

    @app.middleware("http")
    async def limits(request, call_next):
        request.state.request_id = str(uuid4())
        content_length = request.headers.get("content-length", "0")
        if (
            len(content_length) > 18
            or not content_length.isdigit()
            or int(content_length) > settings.max_upload_bytes + 65536
        ):
            return failure(request, 413, "UPLOAD_TOO_LARGE", "Request exceeds the upload limit.")
        if request.url.path not in {"/health", "/api/v1/health"}:
            identity = request.headers.get(
                "authorization", request.client.host if request.client else "anonymous"
            )
            now = time.monotonic()
            if len(buckets) > 10000:
                buckets.clear()
            # A session budget plus a broader peer budget prevents simple token rotation.
            # Forwarded client IP headers are not trusted from arbitrary direct callers.
            peer = request.client.host if request.client else "anonymous"
            for namespace, value, budget in [
                ("session", identity, settings.requests_per_minute),
                ("peer", peer, settings.requests_per_minute * 5),
            ]:
                key = namespace + hashlib.sha256(value.encode()).hexdigest()
                bucket = buckets[key]
                while bucket and bucket[0] < now - 60:
                    bucket.popleft()
                if len(bucket) >= budget:
                    response = failure(
                        request, 429, "RATE_LIMITED", "Too many requests. Try again in a minute."
                    )
                    response.headers["Retry-After"] = "60"
                    return response
                bucket.append(now)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("request_failed request_id=%s", request.state.request_id)
            return failure(request, 500, "INTERNAL_ERROR", "An unexpected service error occurred.")
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return failure(request, exc.status_code, f"HTTP_{exc.status_code}", str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        return failure(
            request,
            422,
            "INVALID_INPUT",
            "Check the marked input fields.",
            [{"field": ".".join(str(x) for x in e["loc"]), "message": e["msg"]} for e in exc.errors()],
        )

    @app.exception_handler(PayloadTooLarge)
    async def body_error(request, exc):
        return failure(request, 413, "UPLOAD_TOO_LARGE", "Request exceeds the upload limit.")

    @app.exception_handler(ModelUnavailable)
    @app.exception_handler(DataUnavailable)
    async def unavailable(request, exc):
        return failure(request, 503, "CAPABILITY_UNAVAILABLE", str(exc))

    @app.get("/health")
    def health():
        database_available = True
        try:
            with store.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception:
            database_available = False
        available = model.model is not None
        result = {
            "status": "online" if available and database_available else "degraded",
            "model_available": available,
            "model_version": model.manifest["model_version"],
            "ready": available and database_available,
            "severity_ready": available and model.manifest["semantics_verified"],
            "database_available": database_available,
            "history_durable": settings.history_durable,
            "semantics_verified": model.manifest["semantics_verified"],
            "shap_available": model.explainer is not None,
            "artifact_sha256": model.manifest["artifact_sha256"],
            "code_version": os.getenv("RENDER_GIT_COMMIT", "local"),
        }
        return JSONResponse(result, status_code=200 if available and database_available else 503)

    @app.get("/model/metadata")
    def metadata():
        return model.metadata()

    @app.post("/predict")
    def predict(payload: PredictionRequest, token: str = Depends(bearer)):
        result = model.predict_many([payload.scenario], explain=payload.explain)[0]
        result["saved"] = payload.save
        store.record(token, result)
        return result

    @app.post("/predict/whatif")
    def whatif(payload: WhatIfRequest, token: str = Depends(bearer)):
        results = model.predict_many([payload.baseline, *payload.scenarios])
        baseline = results[0]
        for result in results[1:]:
            result["feature_differences"] = [
                f for f, value in result["scenario"].items() if value != baseline["scenario"][f]
            ]
        return {
            "baseline": baseline,
            "scenarios": results[1:],
            "model_version": model.manifest["model_version"],
            "limitation": "Probability differences describe model associations, not the causal effect of changing a road or its speed limit.",
        }

    @app.post("/predict/speed-sweep")
    def sweep(payload: SweepRequest, token: str = Depends(bearer)):
        speeds = list(range(payload.start, payload.stop + 1, payload.step))
        scenarios = [Scenario(**(payload.scenario.model_dump() | {"speed_limit": s})) for s in speeds]
        return {
            "speed_unit": model.manifest["speed_unit"],
            "points": [{"speed": s, "prediction": p} for s, p in zip(speeds, model.predict_many(scenarios))],
        }

    async def csv_bytes(file):
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(422, "Upload a CSV file.")
        blob = await file.read(settings.max_upload_bytes + 1)
        await file.close()
        if len(blob) > settings.max_upload_bytes:
            raise HTTPException(413, "CSV is larger than 2 MiB.")
        return blob

    @app.post("/batch/preview")
    async def preview(file: UploadFile = File(...), token: str = Depends(bearer)):
        try:
            headers, rows = read_csv(await csv_bytes(file), settings.max_batch_rows)
            return {"headers": headers, "row_count": len(rows), "preview": rows[:5]}
        except OverflowError as exc:
            raise HTTPException(413, str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc

    @app.post("/predict/batch")
    async def batch(
        file: UploadFile = File(...),
        mapping: str = Form(""),
        format: Literal["json", "csv"] = Query("json"),
        token: str = Depends(bearer),
    ):
        blob = await csv_bytes(file)
        try:
            result = await asyncio.to_thread(infer_batch, blob, mapping, model, settings.max_batch_rows)
        except OverflowError as exc:
            raise HTTPException(413, str(exc)) from exc
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(422, str(exc)) from exc
        if format == "csv":
            return Response(
                export_csv(result),
                media_type="text/csv",
                headers={"Content-Disposition": 'attachment; filename="roadsentinel-batch.csv"'},
            )
        return {**result, "csv": export_csv(result)}

    @app.get("/metrics")
    def metrics():
        if not settings.metrics_path.exists():
            raise DataUnavailable(
                "No reproducible held-out evaluation artifact is available. Accuracy and F1 are not reported."
            )
        data = json.loads(settings.metrics_path.read_text(encoding="utf-8"))
        if (
            data.get("model_version") != model.manifest["model_version"]
            or not data.get("dataset_sha256")
            or data.get("evaluation_set") != "held_out_test"
        ):
            raise DataUnavailable("Evaluation metadata does not match the serving model.")
        return data

    @app.post("/explain/local")
    def local(scenario: Scenario, token: str = Depends(bearer)):
        result = model.predict_many([scenario], explain=True)[0]
        if result["explanation"] is None:
            raise DataUnavailable("Explanations are temporarily unavailable for this model.")
        return result

    @app.get("/insights/overview")
    def dataset_overview():
        return app.state.dataset.overview()

    @app.get("/insights/{dimension}")
    def aggregate(
        dimension: Literal[
            "hourly",
            "weekday",
            "weather",
            "road-surface",
            "lighting",
            "road-type",
            "area-type",
            "speed-bands",
        ],
    ):
        return app.state.dataset.aggregate(dimension)

    @app.get("/hotspots")
    def hotspots():
        return app.state.dataset.hotspots()

    @app.get("/activity")
    def activity(token: str = Depends(bearer)):
        return store.overview(token)

    @app.get("/predictions")
    def history(
        token: str = Depends(bearer),
        search: str = Query("", max_length=100),
        label: str = Query("", max_length=50),
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        order: Literal["newest", "oldest", "confidence"] = "newest",
    ):
        return store.history(token, search, label, page, limit, order)

    @app.get("/predictions/{record_id}")
    def detail(record_id: str, token: str = Depends(bearer)):
        result = store.get(token, record_id)
        if result is None:
            raise HTTPException(404, "Saved prediction not found in this session.")
        return result

    @app.delete("/predictions/{record_id}", status_code=204)
    def remove(record_id: str, token: str = Depends(bearer)):
        if not store.remove(token, record_id):
            raise HTTPException(404, "Saved prediction not found in this session.")
        return Response(status_code=204)

    # Explicit migration aliases; no legacy heuristic or fabricated fallback survives.
    app.add_api_route("/model-metrics", metrics, methods=["GET"], include_in_schema=False)
    app.add_api_route("/predict-batch", batch, methods=["POST"], include_in_schema=False)
    # Versioned aliases preserve one implementation and schema.
    for route in list(app.routes):
        if getattr(route, "path", "").startswith(
            (
                "/health",
                "/model/",
                "/predict",
                "/batch/",
                "/metrics",
                "/explain/",
                "/insights/",
                "/hotspots",
                "/activity",
            )
        ) and getattr(route, "include_in_schema", False):
            app.add_api_route(
                "/api/v1" + route.path, route.endpoint, methods=list(route.methods), include_in_schema=False
            )
    return app


app = create_app()

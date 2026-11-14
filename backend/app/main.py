import hashlib
import logging
import os
import re
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
from pydantic import BaseModel, ConfigDict, Field

from app.services.karnataka import KarnatakaModel

from app.core.config import Settings
from app.database.store import Store
from app.services.dataset import DataUnavailable, DatasetService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("roadsentinel.api")


class ScenarioRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scenario: dict[str, str]
    save: bool = False


class ComparisonRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    baseline: dict[str, str]
    alternative: dict[str, str]


class BatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csv: str = Field(min_length=1, max_length=2_000_000)
    save: bool = False


class SpeedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    speed_kmh: float = Field(default=50, ge=5, le=150)
    reaction_seconds: float = Field(default=1.5, ge=0.5, le=5)
    deceleration_ms2: float = Field(default=5, ge=1, le=10)
    mass_kg: float = Field(default=1500, ge=50, le=40000)


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


def create_app(settings=None):
    settings = settings or Settings()
    store = Store(settings.database_url)

    @asynccontextmanager
    async def lifespan(app):
        store.initialize()
        app.state.dataset = DatasetService(settings)
        app.state.model = KarnatakaModel(settings.release_dir)
        yield
        store.engine.dispose()

    app = FastAPI(
        title="RoadSentinel API",
        version="4.0.0",
        lifespan=lifespan,
        description="Indian road analytics and Karnataka crash-severity research tools.",
    )
    app.state.store, app.state.settings = store, settings
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
        dataset = app.state.dataset
        available = dataset.data is not None
        ready = available and database_available and app.state.model.model is not None
        result = {
            "status": "online" if ready else "degraded",
            "country": "India",
            "model_available": app.state.model.model is not None,
            "model_version": app.state.model.model["model_version"] if app.state.model.model else None,
            "ready": ready,
            "analytics_ready": available,
            "severity_ready": app.state.model.model is not None,
            "database_available": database_available,
            "history_durable": settings.history_durable,
            "semantics_verified": app.state.model.model is not None,
            "shap_available": app.state.model.model is not None,
            "model_artifact_sha256": app.state.model.digest,
            "dataset_version": dataset.version,
            "artifact_sha256": dataset.digest,
            "code_version": os.getenv("RENDER_GIT_COMMIT", "local"),
        }
        return JSONResponse(result, status_code=200 if ready else 503)

    @app.get("/model/metadata")
    def model_metadata():
        app.state.model.require()
        return app.state.model.metadata

    @app.get("/metrics")
    @app.get("/model-metrics")
    def metrics():
        app.state.model.require()
        m = app.state.model.metadata
        return {
            k: m[k]
            for k in [
                "country",
                "region",
                "model_version",
                "evaluation",
                "baseline",
                "classes",
                "split",
                "selection",
            ]
        }

    @app.get("/explain/global")
    def global_explanation():
        app.state.model.require()
        return app.state.model.metadata["explanation"]

    @app.post("/predict")
    def predict(body: ScenarioRequest, token: str = Depends(bearer)):
        result = app.state.model.predict(body.scenario, body.save)
        store.record(token, result)
        return result

    @app.post("/explain/local")
    def explain(body: ScenarioRequest):
        return app.state.model.predict(body.scenario)

    @app.post("/predict/whatif")
    def whatif(body: ComparisonRequest):
        return {
            "baseline": app.state.model.predict(body.baseline),
            "alternative": app.state.model.predict(body.alternative),
            "interpretation": "Changes in model scores, not evidence of causal effects.",
        }

    @app.post("/batch/preview")
    def preview(body: BatchRequest):
        rows = app.state.model.csv_rows(body.csv)
        return {"count": len(rows), "preview": rows[:5]}

    @app.post("/predict/batch")
    @app.post("/predict-batch")
    def batch(body: BatchRequest, token: str = Depends(bearer)):
        rows = app.state.model.csv_rows(body.csv)
        results = [app.state.model.predict(row, body.save) for row in rows]
        for result in results:
            store.record(token, result)
        return {
            "country": "India",
            "region": "Karnataka",
            "model_version": app.state.model.model["model_version"],
            "results": results,
            "count": len(results),
        }

    @app.post("/predict/speed-sweep")
    def speed(body: SpeedRequest):
        def calculate(kmh):
            v = kmh / 3.6
            return {
                "speed_kmh": kmh,
                "reaction_distance_m": v * body.reaction_seconds,
                "braking_distance_m": v * v / (2 * body.deceleration_ms2),
                "stopping_distance_m": v * body.reaction_seconds + v * v / (2 * body.deceleration_ms2),
                "kinetic_energy_kj": 0.5 * body.mass_kg * v * v / 1000,
            }

        return {
            "kind": "physics_calculation",
            "model_version": None,
            "assumptions": body.model_dump(),
            "selected": calculate(body.speed_kmh),
            "curve": [calculate(k) for k in range(10, 151, 10)],
            "explanation": "Idealized level-road calculation with constant deceleration. User assumptions, not measured crash data, a safety guarantee or a recommended speed.",
        }

    @app.get("/insights/crashes")
    def crashes():
        app.state.model.require()
        return app.state.model.analytics

    @app.get("/insights/overview")
    def dataset_overview():
        return app.state.dataset.overview()

    @app.get("/insights/states")
    def states(year: int = Query(2023, ge=2021, le=2023)):
        return app.state.dataset.states(year)

    @app.get("/insights/export")
    def export(year: int | None = Query(None, ge=2021, le=2023)):
        return Response(
            app.state.dataset.export(year),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="roadsentinel-india-aggregates.csv"'},
        )

    @app.get("/hotspots")
    def geography():
        # Historical path retained for clients; geometry is regional, never crash hotspots.
        return app.state.dataset.geography()

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

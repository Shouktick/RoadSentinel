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

from app.core.config import Settings
from app.database.store import Store
from app.services.dataset import DataUnavailable, DatasetService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("roadsentinel.api")
UNSUPPORTED = "Severity prediction is unavailable: suitable licensed Indian crash-level records with multiple injury outcomes have not been verified. State/UT totals support analytics, not individual predictions."


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
        yield
        store.engine.dispose()

    app = FastAPI(
        title="RoadSentinel API",
        version="3.0.0",
        lifespan=lifespan,
        description="India-only official state/UT road accident analytics. Individual severity prediction is disabled.",
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
        ready = available and database_available
        result = {
            "status": "online" if ready else "degraded",
            "country": "India",
            "model_available": False,
            "model_version": None,
            "ready": ready,
            "analytics_ready": available,
            "severity_ready": False,
            "database_available": database_available,
            "history_durable": settings.history_durable,
            "semantics_verified": False,
            "shap_available": False,
            "dataset_version": dataset.version,
            "artifact_sha256": dataset.digest,
            "code_version": os.getenv("RENDER_GIT_COMMIT", "local"),
        }
        return JSONResponse(result, status_code=200 if ready else 503)

    @app.get("/model/metadata")
    def metadata():
        return {
            "country": "India",
            "model_available": False,
            "model_version": None,
            "status": "disabled",
            "reason": UNSUPPORTED,
            "dataset_version": app.state.dataset.version,
            "capabilities": [
                "state_ut_analytics",
                "year_comparison",
                "regional_map",
                "aggregate_csv_export",
                "historical_record_access",
            ],
            "evaluation": None,
        }

    def disabled():
        return JSONResponse(
            {
                "error": {"code": "INDIA_MODEL_UNAVAILABLE", "message": UNSUPPORTED},
                "country": "India",
                "model_version": None,
            },
            status_code=410,
        )

    for path in [
        "/predict",
        "/predict/whatif",
        "/predict/speed-sweep",
        "/predict/batch",
        "/predict-batch",
        "/batch/preview",
        "/explain/local",
    ]:
        app.add_api_route(path, disabled, methods=["POST"])
    for path in ["/metrics", "/model-metrics", "/explain/global"]:
        app.add_api_route(path, disabled, methods=["GET"])

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

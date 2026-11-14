"""Versioned, parameter-bound storage scoped by an unguessable session bearer."""

import hashlib
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    delete,
    func,
    select,
)
from sqlalchemy.pool import StaticPool

metadata = MetaData()
records = Table(
    "predictions",
    metadata,
    Column("id", String(36), primary_key=True),
    Column("owner", String(64), index=True, nullable=False),
    Column("created_at", DateTime(timezone=True), index=True, nullable=False),
    Column("model_version", String(100), nullable=False),
    Column("class_id", String(50), index=True),
    Column("severity", String(50)),
    Column("confidence", Float),
    Column("risk_score", Float),
    Column("saved", Boolean, index=True, nullable=False),
    Column("latency_ms", Float),
    Column("payload", JSON),
)
versions = Table("schema_version", metadata, Column("version", Integer, primary_key=True))


class Store:
    def __init__(self, url: str):
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        kwargs = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
            if ":memory:" in url:
                kwargs["poolclass"] = StaticPool
            else:
                Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        self.engine = create_engine(url, **kwargs)

    def initialize(self):
        metadata.create_all(self.engine)
        with self.engine.begin() as connection:
            if not connection.scalar(select(func.count()).select_from(versions)):
                connection.execute(versions.insert().values(version=1))

    @staticmethod
    def owner(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def record(self, token: str, result: dict):
        # Unsaved activity retains operational metadata only, never the raw scenario.
        with self.engine.begin() as connection:
            connection.execute(
                records.insert().values(
                    id=result["id"],
                    owner=self.owner(token),
                    created_at=datetime.now(timezone.utc),
                    model_version=result["model_version"],
                    class_id=result["class_id"],
                    severity=result["severity"],
                    confidence=result["confidence"],
                    risk_score=result["risk_score"],
                    saved=result["saved"],
                    latency_ms=result["latency_ms"],
                    payload=result if result["saved"] else None,
                )
            )

    def history(self, token: str, search="", label="", page=1, limit=20, order="newest"):
        condition = (records.c.owner == self.owner(token)) & records.c.saved.is_(True)
        if search:
            condition &= records.c.id.contains(search, autoescape=True) | records.c.severity.contains(
                search, autoescape=True
            )
        if label:
            condition &= records.c.severity == label
        with self.engine.connect() as connection:
            total = connection.scalar(select(func.count()).select_from(records).where(condition))
            ordering = {
                "newest": records.c.created_at.desc(),
                "oldest": records.c.created_at.asc(),
                "confidence": records.c.confidence.desc(),
            }[order]
            rows = (
                connection.execute(
                    select(records.c.payload)
                    .where(condition)
                    .order_by(ordering)
                    .offset((page - 1) * limit)
                    .limit(limit)
                )
                .scalars()
                .all()
            )
        return {"items": [self.historical(r) for r in rows], "total": total, "page": page, "limit": limit}

    def get(self, token: str, record_id: str):
        with self.engine.connect() as connection:
            result = connection.scalar(
                select(records.c.payload).where(
                    records.c.owner == self.owner(token), records.c.id == record_id, records.c.saved.is_(True)
                )
            )

        return self.historical(result) if result else None

    @staticmethod
    def historical(payload):
        # Add provenance without changing original labels, probabilities, units or inputs.
        version = payload.get("model_version", "")
        country = (
            "Great Britain"
            if version.startswith("stats19-gb-")
            else payload.get("source_country", "Unknown (legacy)")
        )
        return {**payload, "source_country": country, "historical_only": True}

    def remove(self, token: str, record_id: str) -> bool:
        with self.engine.begin() as connection:
            return bool(
                connection.execute(
                    delete(records).where(
                        records.c.owner == self.owner(token),
                        records.c.id == record_id,
                        records.c.saved.is_(True),
                    )
                ).rowcount
            )

    def overview(self, token: str):
        condition = records.c.owner == self.owner(token)
        with self.engine.connect() as connection:
            total, latency = connection.execute(
                select(func.count(), func.avg(records.c.latency_ms)).select_from(records).where(condition)
            ).one()
            distribution = connection.execute(
                select(records.c.model_version, records.c.severity, func.count())
                .where(condition)
                .group_by(records.c.model_version, records.c.severity)
            ).all()
            saved = connection.scalar(
                select(func.count()).select_from(records).where(condition, records.c.saved.is_(True))
            )
        return {
            "prediction_count": total,
            "saved_count": saved,
            "average_latency_ms": round(latency, 2) if latency is not None else None,
            "class_distribution": [
                {"model_version": v, "label": label, "count": n} for v, label, n in distribution
            ],
            "scope": "This browser's actual single-prediction activity. Deleted saved records are removed from activity too.",
        }

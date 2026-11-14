"""Environment configuration."""

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]


@dataclass
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL", f"sqlite:///{(BACKEND / 'data' / 'roadsentinel.db').as_posix()}"
        )
    )
    model_archive: Path = field(
        default_factory=lambda: Path(os.getenv("MODEL_ARCHIVE", str(BACKEND / "release" / "model.joblib")))
    )
    model_manifest: Path = field(
        default_factory=lambda: Path(
            os.getenv("MODEL_MANIFEST", str(BACKEND / "release" / "model_metadata.json"))
        )
    )
    metrics_path: Path = field(
        default_factory=lambda: Path(os.getenv("METRICS_PATH", str(BACKEND / "release" / "metrics.json")))
    )
    dataset_path: str | None = field(default_factory=lambda: os.getenv("DATASET_PATH"))
    dataset_manifest: str | None = field(default_factory=lambda: os.getenv("DATASET_MANIFEST"))
    origins: list[str] = field(
        default_factory=lambda: [
            x.strip()
            for x in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
            if x.strip()
        ]
    )
    history_durable: bool = field(
        default_factory=lambda: os.getenv("HISTORY_DURABLE", "false").lower() == "true"
    )
    max_upload_bytes: int = 2 * 1024 * 1024
    max_batch_rows: int = 250
    requests_per_minute: int = 120
    shap_enabled: bool = field(default_factory=lambda: os.getenv("SHAP_ENABLED", "true").lower() == "true")

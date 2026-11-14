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
    release_dir: Path = field(default_factory=lambda: BACKEND / "release")
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

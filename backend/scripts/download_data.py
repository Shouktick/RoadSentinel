"""Download public source files, failing closed if DfT revises any bytes."""

import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def main():
    manifest = json.loads((ROOT / "source-manifest.json").read_text(encoding="utf-8"))
    destination = ROOT / "data" / "source"
    destination.mkdir(parents=True, exist_ok=True)
    for name, info in manifest["files"].items():
        path = destination / name
        if not path.exists():
            temporary = path.with_suffix(path.suffix + ".part")
            urllib.request.urlretrieve(info["url"], temporary)
            if hashlib.sha256(temporary.read_bytes()).hexdigest() != info["sha256"]:
                raise ValueError(f"Source revised: {name}. Review provenance before changing the pin.")
            temporary.replace(path)
        if hashlib.sha256(path.read_bytes()).hexdigest() != info["sha256"]:
            raise ValueError(f"Checksum mismatch: {name}")
        print(f"Verified {name}: {info['sha256']}", flush=True)


if __name__ == "__main__":
    main()

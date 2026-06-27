#!/usr/bin/env python3
"""Render build: install backend deps, build frontend, copy to backend/static."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
STATIC = BACKEND / "static"


def run(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
    print(f"==> {' '.join(cmd)}", flush=True)
    subprocess.check_call(cmd, cwd=cwd or ROOT, env=env)


def main() -> None:
    run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    run([sys.executable, "-m", "pip", "install", "-r", str(BACKEND / "requirements.txt")])

    env = os.environ.copy()
    env["VITE_API_URL"] = ""
    run(["npm", "install"], cwd=FRONTEND, env=env)
    run(["npm", "run", "build"], cwd=FRONTEND, env=env)

    dist = FRONTEND / "dist"
    index = dist / "index.html"
    if not index.is_file():
        raise SystemExit(f"Frontend build failed: missing {index}")

    if STATIC.exists():
        shutil.rmtree(STATIC)
    shutil.copytree(dist, STATIC)

    size = index.stat().st_size
    print(f"==> Build OK ({size} bytes index.html, {len(list(STATIC.rglob('*')))} files)", flush=True)


if __name__ == "__main__":
    main()

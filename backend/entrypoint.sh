#!/bin/sh
set -e

PORT="${PORT:-8000}"
cd /app
echo "Starting DevGraph FastAPI Backend on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"

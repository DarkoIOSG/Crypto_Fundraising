#!/bin/bash
# Start API + dashboard in one command.
# Run from repo root.

set -e

echo "==> Starting FastAPI backend on :8000"
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

echo "==> Starting React dashboard on :5173"
cd dashboard && npm run dev &
DASH_PID=$!

echo ""
echo "  API:       http://localhost:8000"
echo "  Docs:      http://localhost:8000/docs"
echo "  Dashboard: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both"

trap "kill $API_PID $DASH_PID 2>/dev/null" INT TERM
wait

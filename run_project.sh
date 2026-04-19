#!/bin/bash
echo "Starting Emotion Monitoring Web Application..."
echo "Starting Python Backend on port 5001..."
PORT=5001 python3 python_backend/app.py &
PYTHON_PID=$!

echo "Starting Node.js server on port 5002..."
npm run dev

# When node server stops, kill python server
kill $PYTHON_PID

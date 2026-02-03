#!/bin/bash

echo "========================================"
echo "  Transit Flow AI - Full Stack Startup"
echo "========================================"
echo ""

echo "Starting Python Backend Server..."
cd backend
python3 server.py &
BACKEND_PID=$!
cd ..

sleep 3

echo "Starting React Frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  Both servers are running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop both servers"

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes
wait

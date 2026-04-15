#!/bin/bash
echo "Stopping all nodes..."

for pidfile in /tmp/replica-1.pid /tmp/replica-2.pid /tmp/replica-3.pid /tmp/primary.pid; do
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    kill "$pid" 2>/dev/null && echo "Stopped PID $pid"
    rm "$pidfile"
  fi
done

pkill -f "replica.js" 2>/dev/null
pkill -f "server.js" 2>/dev/null

echo "All nodes stopped."
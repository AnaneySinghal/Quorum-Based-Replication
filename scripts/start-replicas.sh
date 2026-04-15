#!/bin/bash
echo "Starting all replica nodes..."

pkill -f "replica.js" 2>/dev/null
pkill -f "server.js" 2>/dev/null
sleep 1

echo "Starting Replica 1 on port 3001..."
REPLICA_ID=replica-1 PORT=3001 node replica.js &
echo $! > /tmp/replica-1.pid

echo "Starting Replica 2 on port 3002..."
REPLICA_ID=replica-2 PORT=3002 node replica.js &
echo $! > /tmp/replica-2.pid

echo "Starting Replica 3 on port 3003..."
REPLICA_ID=replica-3 PORT=3003 node replica.js &
echo $! > /tmp/replica-3.pid

sleep 2

echo "Starting Primary Server on port 3000..."
node server.js &
echo $! > /tmp/primary.pid

echo ""
echo "All nodes started!"
echo "Primary:   http://localhost:3000"
echo "Replica 1: http://localhost:3001"
echo "Replica 2: http://localhost:3002"
echo "Replica 3: http://localhost:3003"
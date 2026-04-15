#!/bin/bash
HOSTS=("localhost:3000" "localhost:3001" "localhost:3002" "localhost:3003")
NAMES=("Primary" "Replica-1" "Replica-2" "Replica-3")

echo "========================================"
echo "   Replica Health Check"
echo "========================================"

up_count=0

for i in "${!HOSTS[@]}"; do
  host="${HOSTS[$i]}"
  name="${NAMES[$i]}"
  ip=$(echo $host | cut -d: -f1)
  port=$(echo $host | cut -d: -f2)

  if (echo > /dev/tcp/$ip/$port) 2>/dev/null; then
    echo "  OK $name ($host) - UP"
    ((up_count++))
  else
    echo "  FAIL $name ($host) - DOWN"
  fi
done

echo "========================================"
echo "  Nodes up: $up_count / ${#HOSTS[@]}"
echo "========================================"
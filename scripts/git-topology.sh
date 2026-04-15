#!/bin/bash
echo "========================================"
echo "   Git Replica Topology Tracker"
echo "========================================"

if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
  git add .
  git commit -m "Initial quorum replication setup"
fi

echo "Current Topology:"
cat replica-topology.json

echo ""
echo "Committing topology to Git..."
git add replica-topology.json
git diff --cached --quiet && echo "No topology changes to commit." || \
  git commit -m "topology: update replica set $(date '+%Y-%m-%d %H:%M:%S')"

echo ""
echo "Topology Change History:"
git log --oneline --all -- replica-topology.json | head -10
echo "========================================"
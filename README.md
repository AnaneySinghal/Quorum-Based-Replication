# QuorumDB — Distributed Replication System

A full-stack quorum-based database replication system built with **Node.js + Express + MongoDB + React**.

## Architecture

```
┌─────────────────────────────────────────┐
│              React Frontend              │
│   Node Dashboard │ Audit Log Viewer     │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────┐
│          Express Backend (Node.js)       │
│  /api/nodes  /api/data  /api/logs       │
└──────────────────┬──────────────────────┘
                   │ Mongoose
┌──────────────────▼──────────────────────┐
│              MongoDB                     │
│  nodes collection │ auditlogs collection│
└─────────────────────────────────────────┘
```

## Features

- **Root DB + Infinite Replica Nodes** — add/remove replicas dynamically
- **Bi-directional sync** — write from any node, propagates to ALL nodes
- **Quorum Consensus** — majority of nodes must be online before write commits
- **Full Audit Log** — every change records: operation, key, old/new value, initiating node, timestamp, quorum info, propagation list
- **Node Management** — bring replicas online/offline to simulate failures
- **Auto-refresh** — UI polls every 5 seconds

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017 (or update `.env`)

### Backend
```bash
cd backend
npm install
# Edit .env if needed (default: mongodb://localhost:27017/quorum_db)
npm start
# Server runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm start
# UI opens on http://localhost:3000
```

## API Reference

### Nodes
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/nodes | List all nodes |
| POST | /api/nodes | Create replica node `{ name }` |
| PATCH | /api/nodes/:id/status | Toggle online/offline `{ status }` |
| DELETE | /api/nodes/:id | Remove replica node |

### Data (Quorum Writes)
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/data/create | Create record `{ nodeId, key, value }` |
| POST | /api/data/write | Update record `{ nodeId, key, value }` |
| POST | /api/data/delete | Delete record `{ nodeId, key }` |

### Logs
| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/logs | Paginated audit logs |
| GET | /api/logs/stats/summary | Aggregate stats |
| GET | /api/logs/node/:nodeId | Logs for specific node |

## Quorum Logic

- A write is **committed** only if `online_nodes > total_nodes * 0.5` (majority quorum)
- If quorum is not met (too many nodes offline), the write is **rejected** and logged as `failed`
- When committed, changes propagate to ALL online nodes simultaneously
- Offline nodes that come back online will be out of sync — manually trigger a refresh or use the "Bring Online" button

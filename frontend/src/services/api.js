import axios from "axios";

const API = axios.create({ baseURL: "/api" });

// ── Nodes ──────────────────────────────────────────────────────────────────
export const fetchNodes = () => API.get("/nodes");
export const createNode = (name) => API.post("/nodes", { name });
export const deleteNode = (nodeId) => API.delete(`/nodes/${nodeId}`);
export const toggleNodeStatus = (nodeId, status) =>
  API.patch(`/nodes/${nodeId}/status`, { status });

// ── Data ───────────────────────────────────────────────────────────────────
export const createRecord = (nodeId, key, value) =>
  API.post("/data/create", { nodeId, key, value });
export const updateRecord = (nodeId, key, value) =>
  API.post("/data/write", { nodeId, key, value });
export const deleteRecord = (nodeId, key) =>
  API.post("/data/delete", { nodeId, key });

// ── Logs ───────────────────────────────────────────────────────────────────
export const fetchLogs = (page = 1, limit = 50) =>
  API.get(`/logs?page=${page}&limit=${limit}`);
export const fetchLogStats = () => API.get("/logs/stats/summary");

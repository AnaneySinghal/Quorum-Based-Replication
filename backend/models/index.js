const mongoose = require("mongoose");

// ─── Data Record Schema ───────────────────────────────────────────────────────
const recordSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  version: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now },
});

// ─── Node Schema ──────────────────────────────────────────────────────────────
const nodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["root", "replica"], default: "replica" },
  status: {
    type: String,
    enum: ["online", "offline", "syncing"],
    default: "online",
  },
  data: [recordSchema],
  lastSyncAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// ─── Audit Log Schema ─────────────────────────────────────────────────────────
const auditLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  operation: {
    type: String,
    enum: ["CREATE", "UPDATE", "DELETE", "SYNC"],
    required: true,
  },
  key: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  initiatedBy: { type: String, required: true }, // nodeId
  initiatedByName: { type: String },
  propagatedTo: [{ type: String }], // list of nodeIds
  quorumAchieved: { type: Boolean, default: false },
  quorumCount: { type: Number, default: 0 },
  totalNodes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "committed", "failed"],
    default: "pending",
  },
  timestamp: { type: Date, default: Date.now },
});

const Node = mongoose.model("Node", nodeSchema);
const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = { Node, AuditLog };

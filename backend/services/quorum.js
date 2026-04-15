const { v4: uuidv4 } = require("uuid");
const { Node, AuditLog } = require("../models");

const QUORUM_THRESHOLD = 0.5; // majority

// ─── Get all online nodes ─────────────────────────────────────────────────────
async function getOnlineNodes() {
  return await Node.find({ status: { $in: ["online", "syncing"] } });
}

// ─── Check quorum ─────────────────────────────────────────────────────────────
function hasQuorum(onlineCount, totalCount) {
  return onlineCount > totalCount * QUORUM_THRESHOLD;
}

// ─── Write operation with quorum + propagation ───────────────────────────────
async function writeWithQuorum({ initiatorNodeId, key, value, operation }) {
  const allNodes = await Node.find({});
  const onlineNodes = allNodes.filter((n) => n.status !== "offline");
  const totalNodes = allNodes.length;
  const onlineCount = onlineNodes.length;

  const quorumAchieved = hasQuorum(onlineCount, totalNodes);

  const logId = uuidv4();
  const log = new AuditLog({
    logId,
    operation,
    key,
    oldValue: null,
    newValue: value,
    initiatedBy: initiatorNodeId,
    initiatedByName:
      allNodes.find((n) => n.nodeId === initiatorNodeId)?.name ||
      initiatorNodeId,
    propagatedTo: [],
    quorumAchieved,
    quorumCount: onlineCount,
    totalNodes,
    status: quorumAchieved ? "pending" : "failed",
  });

  if (!quorumAchieved) {
    await log.save();
    return { success: false, message: "Quorum not achieved", log };
  }

  const propagatedTo = [];

  // Apply change to all online nodes
  for (const node of onlineNodes) {
    const existingRecord = node.data.find((d) => d.key === key);
    const oldValue = existingRecord?.value ?? null;

    if (operation === "DELETE") {
      node.data = node.data.filter((d) => d.key !== key);
    } else {
      if (existingRecord) {
        existingRecord.value = value;
        existingRecord.version += 1;
        existingRecord.updatedAt = new Date();
        if (log.oldValue === null) log.oldValue = oldValue;
      } else {
        node.data.push({ key, value, version: 1, updatedAt: new Date() });
      }
    }

    node.lastSyncAt = new Date();
    node.status = "online";
    await node.save();
    propagatedTo.push(node.nodeId);
  }

  log.propagatedTo = propagatedTo;
  log.status = "committed";
  await log.save();

  return {
    success: true,
    log,
    propagatedTo,
    quorumAchieved,
    onlineCount,
    totalNodes,
  };
}

// ─── Delete operation ─────────────────────────────────────────────────────────
async function deleteWithQuorum({ initiatorNodeId, key }) {
  return writeWithQuorum({
    initiatorNodeId,
    key,
    value: null,
    operation: "DELETE",
  });
}

// ─── Get node data ────────────────────────────────────────────────────────────
async function getNodeData(nodeId) {
  const node = await Node.findOne({ nodeId });
  if (!node) throw new Error(`Node ${nodeId} not found`);
  return node;
}

module.exports = {
  writeWithQuorum,
  deleteWithQuorum,
  getNodeData,
  getOnlineNodes,
};

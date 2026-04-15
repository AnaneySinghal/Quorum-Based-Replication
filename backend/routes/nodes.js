const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { Node } = require("../models");

// GET all nodes
router.get("/", async (req, res) => {
  try {
    const nodes = await Node.find({}).sort({ type: 1, createdAt: 1 });
    res.json({ success: true, nodes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single node
router.get("/:nodeId", async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.nodeId });
    if (!node)
      return res
        .status(404)
        .json({ success: false, message: "Node not found" });
    res.json({ success: true, node });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create a new replica node
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Node name required" });

    // Get root node data to initialize replica
    const rootNode = await Node.findOne({ type: "root" });

    const node = new Node({
      nodeId: uuidv4(),
      name,
      type: "replica",
      status: "online",
      data: rootNode
        ? rootNode.data.map((d) => ({ ...d.toObject(), _id: undefined }))
        : [],
      lastSyncAt: new Date(),
    });

    await node.save();
    res.status(201).json({ success: true, node });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle node status (online/offline)
router.patch("/:nodeId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const node = await Node.findOne({ nodeId: req.params.nodeId });
    if (!node)
      return res
        .status(404)
        .json({ success: false, message: "Node not found" });
    if (node.type === "root" && status === "offline") {
      return res
        .status(400)
        .json({ success: false, message: "Root node cannot be taken offline" });
    }
    node.status = status;
    await node.save();
    res.json({ success: true, node });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE remove a replica node
router.delete("/:nodeId", async (req, res) => {
  try {
    const node = await Node.findOne({ nodeId: req.params.nodeId });
    if (!node)
      return res
        .status(404)
        .json({ success: false, message: "Node not found" });
    if (node.type === "root")
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete root node" });
    await Node.deleteOne({ nodeId: req.params.nodeId });
    res.json({ success: true, message: "Node deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

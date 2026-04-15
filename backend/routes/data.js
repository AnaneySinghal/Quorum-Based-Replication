const express = require("express");
const router = express.Router();
const { writeWithQuorum, deleteWithQuorum } = require("../services/quorum");

// POST write/update a key-value — triggers quorum replication
router.post("/write", async (req, res) => {
  try {
    const { nodeId, key, value } = req.body;
    if (!nodeId || !key || value === undefined) {
      return res
        .status(400)
        .json({
          success: false,
          message: "nodeId, key, and value are required",
        });
    }

    const result = await writeWithQuorum({
      initiatorNodeId: nodeId,
      key,
      value,
      operation: "UPDATE",
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new key — triggers quorum replication
router.post("/create", async (req, res) => {
  try {
    const { nodeId, key, value } = req.body;
    if (!nodeId || !key || value === undefined) {
      return res
        .status(400)
        .json({
          success: false,
          message: "nodeId, key, and value are required",
        });
    }

    const result = await writeWithQuorum({
      initiatorNodeId: nodeId,
      key,
      value,
      operation: "CREATE",
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE a key — triggers quorum replication
router.post("/delete", async (req, res) => {
  try {
    const { nodeId, key } = req.body;
    if (!nodeId || !key) {
      return res
        .status(400)
        .json({ success: false, message: "nodeId and key are required" });
    }

    const result = await deleteWithQuorum({ initiatorNodeId: nodeId, key });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

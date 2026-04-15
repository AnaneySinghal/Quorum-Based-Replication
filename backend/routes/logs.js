const express = require("express");
const router = express.Router();
const { AuditLog } = require("../models");

// GET all audit logs (paginated, newest first)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET logs for a specific node
router.get("/node/:nodeId", async (req, res) => {
  try {
    const logs = await AuditLog.find({ initiatedBy: req.params.nodeId })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET stats
router.get("/stats/summary", async (req, res) => {
  try {
    const total = await AuditLog.countDocuments();
    const committed = await AuditLog.countDocuments({ status: "committed" });
    const failed = await AuditLog.countDocuments({ status: "failed" });
    const creates = await AuditLog.countDocuments({ operation: "CREATE" });
    const updates = await AuditLog.countDocuments({ operation: "UPDATE" });
    const deletes = await AuditLog.countDocuments({ operation: "DELETE" });

    res.json({
      success: true,
      stats: { total, committed, failed, creates, updates, deletes },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

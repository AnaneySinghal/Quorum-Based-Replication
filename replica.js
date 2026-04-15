const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const REPLICA_ID = process.env.REPLICA_ID || "replica-1";
const PORT = process.env.PORT || 3001;
const DB_NAME = `quorum_${REPLICA_ID.replace("-", "_")}`;

mongoose
  .connect(`mongodb://localhost:27017/${DB_NAME}`)
  .then(() => console.log(`[${REPLICA_ID}] MongoDB connected: ${DB_NAME}`))
  .catch((err) => console.error(`[${REPLICA_ID}] MongoDB error:`, err.message));

const DataSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  replicaId: { type: String, default: REPLICA_ID },
  updatedAt: { type: Date, default: Date.now },
});
const Data = mongoose.model("Data", DataSchema);

app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    role: "replica",
    id: REPLICA_ID,
    database: dbStatus,
    dbName: DB_NAME,
  });
});

app.post("/replicate", async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined)
    return res.status(400).json({ error: "key and value required" });
  try {
    await Data.findOneAndUpdate(
      { key },
      { key, value, replicaId: REPLICA_ID, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    console.log(`[${REPLICA_ID}] Saved: key="${key}" value="${value}"`);
    res.json({ status: "ack", replicaId: REPLICA_ID });
  } catch (err) {
    console.error(`[${REPLICA_ID}] Write error:`, err.message);
    res.status(500).json({ error: "Database write failed" });
  }
});

app.get("/data/:key", async (req, res) => {
  try {
    const entry = await Data.findOne({ key: req.params.key });
    if (!entry) return res.status(404).json({ error: "Key not found" });
    res.json({
      key: entry.key,
      value: entry.value,
      updatedAt: entry.updatedAt,
      replicaId: entry.replicaId,
    });
  } catch (err) {
    res.status(500).json({ error: "Database read failed" });
  }
});

app.get("/data", async (req, res) => {
  try {
    const all = await Data.find({}).sort({ updatedAt: -1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: "Database read failed" });
  }
});

app.delete("/data/:key", async (req, res) => {
  try {
    await Data.deleteOne({ key: req.params.key });
    res.json({ status: "deleted", key: req.params.key });
  } catch (err) {
    res.status(500).json({ error: "Database delete failed" });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const count = await Data.countDocuments();
    const latest = await Data.findOne({}).sort({ updatedAt: -1 });
    res.json({
      replicaId: REPLICA_ID,
      dbName: DB_NAME,
      totalRecords: count,
      latestKey: latest ? latest.key : null,
      latestUpdate: latest ? latest.updatedAt : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Stats failed" });
  }
});

app.listen(PORT, () =>
  console.log(`Replica [${REPLICA_ID}] running on port ${PORT}`),
);

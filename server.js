const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const TOPOLOGY_FILE = path.join(__dirname, "replica-topology.json");

function loadTopology() {
  if (fs.existsSync(TOPOLOGY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TOPOLOGY_FILE, "utf8"));
    } catch {
      return defaultTopology();
    }
  }
  return defaultTopology();
}

function defaultTopology() {
  return {
    replicas: [
      { id: "replica-1", host: "localhost", port: 3001, status: "up" },
      { id: "replica-2", host: "localhost", port: 3002, status: "up" },
      { id: "replica-3", host: "localhost", port: 3003, status: "up" },
    ],
  };
}

function saveTopology(topology) {
  fs.writeFileSync(TOPOLOGY_FILE, JSON.stringify(topology, null, 2));
}

function getWriteQuorum(replicas) {
  return Math.floor(replicas.length / 2) + 1;
}

async function checkReplicaHealth(replica) {
  try {
    const res = await axios.get(
      `http://${replica.host}:${replica.port}/health`,
      { timeout: 2000 },
    );
    return res.status === 200;
  } catch {
    return false;
  }
}

async function getAvailableReplicas() {
  const topology = loadTopology();
  const checks = await Promise.all(
    topology.replicas.map(async (r) => ({
      ...r,
      alive: await checkReplicaHealth(r),
    })),
  );
  return checks.filter((r) => r.alive);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/write", async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined)
    return res.status(400).json({ error: "key and value are required" });
  const topology = loadTopology();
  const quorum = getWriteQuorum(topology.replicas);
  const available = await getAvailableReplicas();
  if (available.length < quorum) {
    return res
      .status(503)
      .json({
        error: "Not enough replicas for write quorum",
        required: quorum,
        available: available.length,
      });
  }
  const results = await Promise.all(
    available.map((r) =>
      axios
        .post(
          `http://${r.host}:${r.port}/replicate`,
          { key, value },
          { timeout: 3000 },
        )
        .then(() => ({ id: r.id, success: true }))
        .catch(() => ({ id: r.id, success: false })),
    ),
  );
  const acks = results.filter((r) => r.success);
  if (acks.length >= quorum) {
    return res.json({
      status: "success",
      message: "Write confirmed with quorum",
      acks: acks.length,
      quorum,
      acknowledgedBy: acks.map((r) => r.id),
    });
  } else {
    return res
      .status(503)
      .json({
        error: "Write failed: quorum not reached",
        acks: acks.length,
        quorum,
      });
  }
});

app.get("/read/:key", async (req, res) => {
  const available = await getAvailableReplicas();
  if (available.length < 1)
    return res.status(503).json({ error: "No replicas available" });
  const replica = available[Math.floor(Math.random() * available.length)];
  try {
    const response = await axios.get(
      `http://${replica.host}:${replica.port}/data/${req.params.key}`,
      { timeout: 2000 },
    );
    return res.json({ ...response.data, readFrom: replica.id, stale: true });
  } catch {
    return res.status(404).json({ error: "Key not found" });
  }
});

app.delete("/delete/:key", async (req, res) => {
  const available = await getAvailableReplicas();
  const topology = loadTopology();
  const quorum = getWriteQuorum(topology.replicas);
  if (available.length < quorum)
    return res
      .status(503)
      .json({ error: "Not enough replicas for delete quorum" });
  const results = await Promise.all(
    available.map((r) =>
      axios
        .delete(`http://${r.host}:${r.port}/data/${req.params.key}`, {
          timeout: 3000,
        })
        .then(() => ({ id: r.id, success: true }))
        .catch(() => ({ id: r.id, success: false })),
    ),
  );
  const acks = results.filter((r) => r.success);
  if (acks.length >= quorum) {
    return res.json({
      status: "success",
      message: "Key deleted with quorum",
      acks: acks.length,
    });
  } else {
    return res.status(503).json({ error: "Delete failed: quorum not reached" });
  }
});

app.get("/all-data", async (req, res) => {
  const available = await getAvailableReplicas();
  if (available.length < 1)
    return res.status(503).json({ error: "No replicas available" });
  const replica = available[0];
  try {
    const response = await axios.get(
      `http://${replica.host}:${replica.port}/data`,
      { timeout: 2000 },
    );
    return res.json({ data: response.data, source: replica.id });
  } catch {
    return res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.get("/topology", (req, res) => res.json(loadTopology()));

app.post("/topology/add", (req, res) => {
  const { id, host, port } = req.body;
  const topology = loadTopology();
  topology.replicas.push({ id, host, port: parseInt(port), status: "up" });
  saveTopology(topology);
  res.json({ message: `Replica ${id} added`, topology });
});

app.delete("/topology/:id", (req, res) => {
  const topology = loadTopology();
  topology.replicas = topology.replicas.filter((r) => r.id !== req.params.id);
  saveTopology(topology);
  res.json({ message: `Replica ${req.params.id} removed`, topology });
});

app.get("/health", (req, res) => res.json({ status: "ok", role: "primary" }));

app.get("/status", async (req, res) => {
  const topology = loadTopology();
  const replicaStatus = await Promise.all(
    topology.replicas.map(async (r) => ({
      ...r,
      alive: await checkReplicaHealth(r),
    })),
  );
  const alive = replicaStatus.filter((r) => r.alive).length;
  const writeQuorum = getWriteQuorum(topology.replicas);
  res.json({
    replicas: replicaStatus,
    totalReplicas: topology.replicas.length,
    aliveReplicas: alive,
    writeQuorum,
    readQuorum: 1,
    canWrite: alive >= writeQuorum,
    canRead: alive >= 1,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Primary server running at http://localhost:${PORT}`),
);

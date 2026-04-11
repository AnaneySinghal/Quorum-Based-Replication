require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Node } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quorum_db';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/nodes', require('./routes/nodes'));
app.use('/api/data', require('./routes/data'));
app.use('/api/logs', require('./routes/logs'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Seed initial data ────────────────────────────────────────────────────────
async function seedInitialData() {
  const existingRoot = await Node.findOne({ type: 'root' });
  if (!existingRoot) {
    console.log('🌱 Seeding initial root + replica nodes...');

    const rootNode = new Node({
      nodeId: uuidv4(),
      name: 'Root DB',
      type: 'root',
      status: 'online',
      data: [
        { key: 'app_name', value: 'QuorumDB', version: 1 },
        { key: 'version', value: '1.0.0', version: 1 },
        { key: 'max_connections', value: 100, version: 1 }
      ]
    });
    await rootNode.save();

    const replica1 = new Node({
      nodeId: uuidv4(),
      name: 'Replica Node 1',
      type: 'replica',
      status: 'online',
      data: rootNode.data.map(d => ({ key: d.key, value: d.value, version: d.version }))
    });
    await replica1.save();

    const replica2 = new Node({
      nodeId: uuidv4(),
      name: 'Replica Node 2',
      type: 'replica',
      status: 'online',
      data: rootNode.data.map(d => ({ key: d.key, value: d.value, version: d.version }))
    });
    await replica2.save();

    console.log('✅ Seeded root + 2 replica nodes');
  }
}

// ─── Connect & Start ──────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedInitialData();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

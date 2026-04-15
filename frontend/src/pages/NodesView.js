import React, { useState, useEffect, useCallback } from "react";
import {
  fetchNodes,
  createNode,
  deleteNode,
  toggleNodeStatus,
  createRecord,
  updateRecord,
  deleteRecord,
} from "../services/api";

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function EditModal({ record, nodeId, onSave, onClose }) {
  const [value, setValue] = useState(String(record.value));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Record</div>
        <div
          style={{
            marginBottom: 12,
            color: "var(--text3)",
            fontFamily: "JetBrains Mono",
            fontSize: 12,
          }}
        >
          Key: <span style={{ color: "var(--accent2)" }}>{record.key}</span>
        </div>
        <input
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New value..."
          style={{ width: "100%" }}
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(record.key, value)}
          >
            Save and Replicate
          </button>
        </div>
      </div>
    </div>
  );
}

function NodeCard({ node, onRefresh, onToast }) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editRecord, setEditRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  const isOffline = node.status === "offline";
  const isRoot = node.type === "root";

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) return;
    setLoading(true);
    try {
      const res = await createRecord(
        node.nodeId,
        newKey.trim(),
        newValue.trim(),
      );
      if (res.data.success) {
        const { quorumCount, totalNodes } = res.data;
        onToast(
          "Created " +
            newKey +
            " - replicated to " +
            res.data.propagatedTo?.length +
            " nodes (quorum: " +
            quorumCount +
            "/" +
            totalNodes +
            ")",
          "success",
        );
        setNewKey("");
        setNewValue("");
        onRefresh();
      }
    } catch (e) {
      onToast(
        "Error: " + (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
    setLoading(false);
  }

  async function handleUpdate(key, value) {
    setLoading(true);
    try {
      const res = await updateRecord(node.nodeId, key, value);
      if (res.data.success) {
        onToast(
          "Updated " +
            key +
            " - replicated to " +
            res.data.propagatedTo?.length +
            " nodes",
          "success",
        );
        onRefresh();
      }
    } catch (e) {
      onToast(
        "Error: " + (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
    setEditRecord(null);
    setLoading(false);
  }

  async function handleDelete(key) {
    if (!window.confirm("Delete key " + key + " from all nodes?")) return;
    setLoading(true);
    try {
      const res = await deleteRecord(node.nodeId, key);
      if (res.data.success) {
        onToast("Deleted " + key + " from all nodes", "warn");
        onRefresh();
      }
    } catch (e) {
      onToast(
        "Error: " + (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
    setLoading(false);
  }

  async function handleToggle() {
    const newStatus = isOffline ? "online" : "offline";
    try {
      await toggleNodeStatus(node.nodeId, newStatus);
      onToast(
        "Node " + node.name + " is now " + newStatus,
        newStatus === "online" ? "success" : "warn",
      );
      onRefresh();
    } catch (e) {
      onToast(
        "Error: " + (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
  }

  async function handleDeleteNode() {
    if (!window.confirm("Remove node " + node.name + "?")) return;
    try {
      await deleteNode(node.nodeId);
      onToast("Node " + node.name + " removed", "warn");
      onRefresh();
    } catch (e) {
      onToast(
        "Error: " + (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
  }

  return (
    <>
      <div
        className={`node-card ${isRoot ? "root" : "replica"} ${isOffline ? "offline" : ""}`}
      >
        <div className="node-header">
          <div className="node-info">
            <div
              className={`node-badge ${isRoot ? "root" : "replica " + node.status} ${isOffline ? "offline" : ""}`}
            />
            <div>
              <div className="node-name">{node.name}</div>
              <div className="node-type">
                {isRoot ? "ROOT" : "REPLICA"} - {node.status.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="node-actions">
            {!isRoot && (
              <>
                <button
                  className={`btn ${isOffline ? "btn-primary" : "btn-warn"}`}
                  onClick={handleToggle}
                  style={{ fontSize: 10 }}
                >
                  {isOffline ? "Bring Online" : "Go Offline"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteNode}
                  style={{ fontSize: 10 }}
                >
                  X
                </button>
              </>
            )}
          </div>
        </div>

        <div className="node-data">
          {node.data.length === 0 ? (
            <div className="no-data">no records</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>KEY</th>
                  <th>VALUE</th>
                  <th>VER</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {node.data.map((record) => (
                  <tr key={record.key}>
                    <td className="td-key">{record.key}</td>
                    <td className="td-value">{String(record.value)}</td>
                    <td className="td-ver">v{record.version}</td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="btn-icon edit"
                          onClick={() => setEditRecord(record)}
                          disabled={isOffline || loading}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-icon del"
                          onClick={() => handleDelete(record.key)}
                          disabled={isOffline || loading}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isOffline && (
            <div className="add-record-form">
              <input
                className="input"
                placeholder="key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <input
                className="input"
                placeholder="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={loading}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      </div>

      {editRecord && (
        <EditModal
          record={editRecord}
          nodeId={node.nodeId}
          onSave={handleUpdate}
          onClose={() => setEditRecord(null)}
        />
      )}
    </>
  );
}

export default function NodesView() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNodeName, setNewNodeName] = useState("");
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  };

  const loadNodes = useCallback(async () => {
    try {
      const res = await fetchNodes();
      setNodes(res.data.nodes);
    } catch (e) {
      addToast("Failed to load nodes", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNodes();
    const interval = setInterval(loadNodes, 5000);
    return () => clearInterval(interval);
  }, [loadNodes]);

  async function handleAddNode() {
    if (!newNodeName.trim()) return;
    try {
      const res = await createNode(newNodeName.trim());
      if (res.data.success) {
        addToast("Node " + newNodeName + " created and synced", "success");
        setNewNodeName("");
        loadNodes();
      }
    } catch (e) {
      addToast(
        "Error creating node: " +
          (e.response?.data?.message || "Something went wrong"),
        "error",
      );
    }
  }

  const rootNodes = nodes.filter((n) => n.type === "root");
  const replicaNodes = nodes.filter((n) => n.type === "replica");
  const onlineCount = nodes.filter((n) => n.status === "online").length;
  const quorumSafe = onlineCount > nodes.length * 0.5;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading nodes...
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Node Cluster</div>
      
      <div className="stat-bar">
        <div className="stat-card">
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value accent">{nodes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Online</div>
          <div className="stat-value accent">{onlineCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Offline</div>
          <div className="stat-value danger">
            {nodes.filter((n) => n.status === "offline").length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quorum Status</div>
          <div className={`stat-value ${quorumSafe ? "accent" : "danger"}`}>
            {quorumSafe ? "SAFE" : "AT RISK"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Root Node</div>
          <div className="stat-value gold">1</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Replicas</div>
          <div className="stat-value">{replicaNodes.length}</div>
        </div>
      </div>

      <div className="add-node-bar">
        <input
          className="input"
          placeholder="New replica node name..."
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
          style={{ maxWidth: 300 }}
        />
        <button className="btn btn-primary" onClick={handleAddNode}>
          + Add Replica Node
        </button>
        <span
          style={{
            color: "var(--text3)",
            fontSize: 12,
            fontFamily: "JetBrains Mono",
            marginLeft: 8,
          }}
        >
          New nodes inherit root data automatically
        </span>
      </div>

      {rootNodes.length > 0 && (
        <>
          <div
            style={{
              color: "var(--root-color)",
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 2,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Root Database
          </div>
          <div className="nodes-grid" style={{ marginBottom: 32 }}>
            {rootNodes.map((node) => (
              <NodeCard
                key={node.nodeId}
                node={node}
                onRefresh={loadNodes}
                onToast={addToast}
              />
            ))}
          </div>
        </>
      )}

      {replicaNodes.length > 0 && (
        <>
          <div
            style={{
              color: "var(--accent)",
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 2,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Replica Nodes ({replicaNodes.length})
          </div>
          <div className="nodes-grid">
            {replicaNodes.map((node) => (
              <NodeCard
                key={node.nodeId}
                node={node}
                onRefresh={loadNodes}
                onToast={addToast}
              />
            ))}
          </div>
        </>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}

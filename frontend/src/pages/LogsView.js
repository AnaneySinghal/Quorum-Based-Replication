import React, { useState, useEffect, useCallback } from "react";
import { fetchLogs, fetchLogStats } from "../services/api";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

function QuorumBar({ count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="quorum-bar">
      <div className="quorum-fill">
        <div
          className="quorum-fill-inner"
          style={{
            width: pct + "%",
            background: pct > 50 ? "var(--accent)" : "var(--danger)",
          }}
        />
      </div>
      <span style={{ color: "var(--text3)", fontSize: 11 }}>
        {count}/{total}
      </span>
    </div>
  );
}

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchLogs(page, 50),
        fetchLogStats(),
      ]);
      setLogs(logsRes.data.logs);
      setTotalPages(logsRes.data.totalPages);
      setStats(statsRes.data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredLogs =
    filter === "ALL" ? logs : logs.filter((l) => l.operation === filter);

  return (
    <div>
      <div className="page-title">Audit Logs</div>
      <div className="page-sub">
        full change history
      </div>

      {stats && (
        <div className="stat-bar">
          <div className="stat-card">
            <div className="stat-label">Total Operations</div>
            <div className="stat-value accent">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Committed</div>
            <div className="stat-value accent">{stats.committed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value danger">{stats.failed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Creates</div>
            <div className="stat-value" style={{ color: "var(--accent2)" }}>
              {stats.creates}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Updates</div>
            <div className="stat-value">{stats.updates}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Deletes</div>
            <div className="stat-value danger">{stats.deletes}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["ALL", "CREATE", "UPDATE", "DELETE"].map((op) => (
          <button
            key={op}
            className={`btn ${filter === op ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(op)}
            style={{ fontSize: 11 }}
          >
            {op}
          </button>
        ))}
        <button
          className="btn btn-ghost"
          onClick={loadData}
          style={{ marginLeft: "auto", fontSize: 11 }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Loading logs...
        </div>
      ) : (
        <>
          <div className="logs-table-wrap">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>OPERATION</th>
                  <th>KEY</th>
                  <th>OLD VALUE</th>
                  <th>NEW VALUE</th>
                  <th>INITIATED BY</th>
                  <th>QUORUM</th>
                  <th>STATUS</th>
                  <th>PROPAGATED TO</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        color: "var(--text3)",
                        padding: 40,
                      }}
                    >
                      no logs yet - go to Nodes tab and make a change
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.logId}>
                      <td
                        style={{
                          color: "var(--text3)",
                          whiteSpace: "nowrap",
                          fontSize: 11,
                        }}
                      >
                        {formatTime(log.timestamp)}
                      </td>
                      <td>
                        <span className={`op-badge op-${log.operation}`}>
                          {log.operation}
                        </span>
                      </td>
                      <td style={{ color: "var(--accent2)" }}>{log.key}</td>
                      <td
                        style={{
                          color: "var(--text3)",
                          maxWidth: 100,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.oldValue !== null && log.oldValue !== undefined
                          ? String(log.oldValue)
                          : "-"}
                      </td>
                      <td
                        style={{
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.newValue !== null && log.newValue !== undefined
                          ? String(log.newValue)
                          : "-"}
                      </td>
                      <td>
                        <span
                          style={{
                            color: log.initiatedByName?.includes("Root")
                              ? "var(--root-color)"
                              : "var(--accent)",
                          }}
                        >
                          {log.initiatedByName ||
                            log.initiatedBy.slice(0, 8) + "..."}
                        </span>
                      </td>
                      <td>
                        <QuorumBar
                          count={log.quorumCount}
                          total={log.totalNodes}
                        />
                      </td>
                      <td>
                        <span>
                          <span className={`status-dot ${log.status}`} />
                          <span
                            style={{
                              color:
                                log.status === "committed"
                                  ? "var(--accent)"
                                  : log.status === "failed"
                                    ? "var(--danger)"
                                    : "var(--warn)",
                              fontSize: 11,
                            }}
                          >
                            {log.status.toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td style={{ color: "var(--text3)", fontSize: 11 }}>
                        {log.propagatedTo?.length > 0
                          ? log.propagatedTo.length + " nodes"
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginTop: 20,
              }}
            >
              <button
                className="btn btn-ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span
                style={{
                  color: "var(--text3)",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  alignSelf: "center",
                }}
              >
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

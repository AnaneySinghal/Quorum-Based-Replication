import React, { useState } from "react";
import NodesView from "./pages/NodesView";
import LogsView from "./pages/LogsView";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("nodes");

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">QuorumDB</span>
          </div>
          <span className="tagline">Distributed Replication System</span>
        </div>
        <nav className="nav">
          <button
            className={`nav-btn ${activeTab === "nodes" ? "active" : ""}`}
            onClick={() => setActiveTab("nodes")}
          >
            <span>⬡</span> Nodes
          </button>
          <button
            className={`nav-btn ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            <span>◎</span> Audit Logs
          </button>
        </nav>
      </header>

      <main className="main">
        {activeTab === "nodes" ? <NodesView /> : <LogsView />}
      </main>
    </div>
  );
}

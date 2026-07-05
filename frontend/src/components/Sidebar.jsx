import React from "react";

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onLogout,
  user,
  stats,
}) {
  return (
    <div style={styles.sidebar}>
      {/* Profile Header */}
      <div style={styles.profileHeader}>
        <div style={styles.avatar}>
          {user?.email ? user.email[0].toUpperCase() : "U"}
        </div>
        <div style={styles.profileInfo}>
          <span style={styles.profileEmail} title={user?.email}>
            {user?.email || "User Profile"}
          </span>
          <span style={styles.profileStatus}>Authenticated</span>
        </div>
      </div>

      {/* New Conversation Button */}
      <button onClick={onCreateSession} style={styles.newChatButton}>
        <svg
          style={styles.buttonIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New Conversation
      </button>

      {/* Sessions List */}
      <div style={styles.sessionsList}>
        <div style={styles.sectionHeader}>Conversations</div>
        {sessions.length === 0 ? (
          <div style={styles.emptySessions}>No chats yet</div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                ...styles.sessionItem,
                ...(activeSessionId === session.id ? styles.activeSession : {}),
              }}
            >
              <svg
                style={styles.chatIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span style={styles.sessionTitle}>{session.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                style={styles.deleteButton}
                title="Delete Chat"
              >
                <svg
                  style={styles.trashIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* System Status Metrics Card */}
      <div style={styles.statusCard}>
        <div style={styles.statusTitle}>RAG System Database</div>
        <div style={styles.metricsContainer}>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats?.totalChunks || 0}</span>
            <span style={styles.metricLabel}>Total Chunks</span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats?.textChunks || 0}</span>
            <span style={styles.metricLabel}>Text Blocks</span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats?.imageChunks || 0}</span>
            <span style={styles.metricLabel}>OCR Images</span>
          </div>
        </div>
      </div>

      {/* Logout Action Footer */}
      <div style={styles.footer}>
        <button onClick={onLogout} style={styles.logoutButton}>
          <svg
            style={styles.logoutIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "320px",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(12px)",
    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    boxSizing: "border-box",
    height: "100%",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "#414febff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "18px",
    boxShadow: "0 2px 8px rgba(88, 101, 242, 0.3)",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  profileEmail: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: "14px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profileStatus: {
    color: "#10b981",
    fontSize: "12px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  newChatButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px",
    backgroundColor: "rgba(88, 101, 242, 0.15)",
    border: "1px solid rgba(88, 101, 242, 0.4)",
    borderRadius: "8px",
    color: "#818cf8",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginBottom: "24px",
  },
  buttonIcon: {
    width: "18px",
    height: "18px",
  },
  sessionsList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  sectionHeader: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  emptySessions: {
    color: "#64748b",
    fontSize: "14px",
    textAlign: "center",
    padding: "16px 0",
  },
  sessionItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    borderRadius: "8px",
    color: "#94a3b8",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative",
    group: "true",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      color: "#e2e8f0",
    },
  },
  activeSession: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
    borderLeft: "3px solid #5865F2",
    paddingLeft: "9px",
  },
  chatIcon: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  sessionTitle: {
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginRight: "24px",
  },
  deleteButton: {
    position: "absolute",
    right: "8px",
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      color: "#ef4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
  },
  trashIcon: {
    width: "14px",
    height: "14px",
  },
  statusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "20px",
  },
  statusTitle: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "12px",
    textAlign: "center",
  },
  metricsContainer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  metricVal: {
    color: "#38bdf8",
    fontSize: "16px",
    fontWeight: "700",
  },
  metricLabel: {
    color: "#64748b",
    fontSize: "9px",
    marginTop: "2px",
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    paddingTop: "16px",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "#f87171",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(248, 113, 113, 0.1)",
    },
  },
  logoutIcon: {
    width: "16px",
    height: "16px",
  },
};

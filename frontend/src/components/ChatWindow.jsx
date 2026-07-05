import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatWindow({
  messages,
  onSendMessage,
  loading,
  activeSessionId,
}) {
  return (
    <div style={styles.chatWindow}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Multi-Modal Document Intelligence</div>
        <div style={styles.headerSub}>RAG answering powered by structured context & OCR</div>
      </div>

      {/* Main Messages Area */}
      <div style={styles.messagesContainer}>
        {!activeSessionId ? (
          <div style={styles.welcomeContainer}>
            <div style={styles.welcomeIcon}>🤖</div>
            <h2 style={styles.welcomeTitle}>Welcome to IMF Document Intelligence</h2>
            <p style={styles.welcomeText}>
              Select a conversation from the sidebar or click "New Conversation" to start questioning your RAG database.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.welcomeContainer}>
            <div style={styles.welcomeIcon}>💬</div>
            <h2 style={styles.welcomeTitle}>New Conversation Started</h2>
            <p style={styles.welcomeText}>
              Ask a question about the reports, e.g. "What is the IMF growth forecast for Qatar?" or upload a new PDF/image document to process and index it into the active vector store.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} loading={loading} />
        )}
      </div>

      {/* Input Bar */}
      {activeSessionId && (
        <MessageInput onSendMessage={onSendMessage} loading={loading} />
      )}
    </div>
  );
}

const styles = {
  chatWindow: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "transparent",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
  },
  headerSub: {
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "2px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
  },
  welcomeContainer: {
    margin: "auto",
    maxWidth: "500px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    animation: "fadeIn 0.6s ease-in-out",
  },
  welcomeIcon: {
    fontSize: "48px",
  },
  welcomeTitle: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: "700",
    margin: 0,
  },
  welcomeText: {
    color: "#94a3b8",
    fontSize: "15px",
    lineHeight: "1.6",
    margin: 0,
  },
};

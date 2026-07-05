import React, { useEffect, useRef } from "react";

export default function MessageList({ messages, loading }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div style={styles.listContainer}>
      {messages.map((message) => {
        const isUser = message.sender === "user";
        return (
          <div
            key={message.id}
            style={{
              ...styles.messageRow,
              justifyContent: isUser ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                ...styles.messageBubble,
                ...(isUser ? styles.userBubble : styles.assistantBubble),
                ...(message.isError ? styles.errorBubble : {}),
              }}
            >
              {/* Media preview (e.g. uploaded file preview) */}
              {message.media_url && (
                <div style={styles.mediaContainer}>
                  {message.media_url.endsWith(".pdf") || message.media_url.includes("blob") ? (
                    <div style={styles.pdfPreview}>
                      <svg
                        style={styles.pdfIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      <span style={styles.pdfLabel}>Uploaded Document</span>
                    </div>
                  ) : (
                    <img
                      src={message.media_url}
                      alt="Uploaded media"
                      style={styles.mediaImage}
                    />
                  )}
                </div>
              )}

              {/* Text content */}
              <div style={styles.textContent}>{message.text_content}</div>

              {/* Citations/sources list */}
              {message.citations && message.citations.length > 0 && (
                <div style={styles.citationsContainer}>
                  <div style={styles.citationsTitle}>Sources:</div>
                  <div style={styles.citationsList}>
                    {message.citations.map((cite, index) => (
                      <div key={index} style={styles.citationItem}>
                        <span style={styles.citationNum}>[{index + 1}]</span>
                        <span style={styles.citationText}>
                          {cite.source} (Relevance: {(cite.relevance_score * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message timestamp */}
              <div style={styles.timestamp}>
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Typing/Loading indicator */}
      {loading && (
        <div style={styles.messageRow} className="typing-animation">
          <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
            <div style={styles.typingIndicator}>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
              <span style={styles.dot}></span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

const styles = {
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: "14px 18px",
    borderRadius: "16px",
    color: "#e2e8f0",
    position: "relative",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    lineHeight: "1.5",
    fontSize: "15px",
    animation: "slideUp 0.3s ease-out",
  },
  userBubble: {
    backgroundColor: "#5865F2",
    borderTopRightRadius: "2px",
    borderLeft: "3px solid #22d3ee",
  },
  assistantBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderTopLeftRadius: "2px",
    borderLeft: "3px solid #38bdf8",
  },
  errorBubble: {
    borderLeft: "3px solid #ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  textContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  mediaContainer: {
    marginBottom: "10px",
    borderRadius: "8px",
    overflow: "hidden",
    maxWidth: "100%",
  },
  mediaImage: {
    maxWidth: "100%",
    maxHeight: "200px",
    objectFit: "contain",
    borderRadius: "6px",
  },
  pdfPreview: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  pdfIcon: {
    width: "24px",
    height: "24px",
    color: "#f43f5e",
  },
  pdfLabel: {
    fontSize: "13px",
    color: "#cbd5e1",
    fontWeight: "500",
  },
  citationsContainer: {
    marginTop: "12px",
    paddingTop: "10px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    fontSize: "12px",
  },
  citationsTitle: {
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: "10px",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  citationsList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  citationItem: {
    color: "#94a3b8",
  },
  citationNum: {
    color: "#38bdf8",
    fontWeight: "600",
    marginRight: "6px",
  },
  citationText: {
    color: "#cbd5e1",
  },
  timestamp: {
    fontSize: "10px",
    color: "#64748b",
    textAlign: "right",
    marginTop: "6px",
  },
  typingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 8px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#94a3b8",
    display: "inline-block",
    animation: "bounce 1.4s infinite ease-in-out both",
  },
};

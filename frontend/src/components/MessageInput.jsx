import React, { useState, useRef } from "react";

export default function MessageInput({ onSendMessage, loading }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview("pdf"); // Just a label indicator for non-image files like PDFs
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;

    onSendMessage(text, file);
    setText("");
    handleRemoveFile();
  };

  const handleKeyDown = (e) => {
    // Submit on Enter keypress (without shift key)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={styles.inputContainer}>
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Attachment preview banner */}
        {filePreview && (
          <div style={styles.previewBanner}>
            {filePreview === "pdf" ? (
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
                <span style={styles.previewName}>{file?.name}</span>
              </div>
            ) : (
              <img src={filePreview} alt="Upload preview" style={styles.imagePreview} />
            )}
            <button
              type="button"
              onClick={handleRemoveFile}
              style={styles.removeButton}
              title="Remove File"
            >
              &times;
            </button>
          </div>
        )}

        <div style={styles.inputRow}>
          {/* File picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={styles.attachButton}
            title="Attach Document or Image"
            disabled={loading}
          >
            <svg
              style={styles.attachIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={styles.hiddenInput}
            accept="image/*,application/pdf"
          />

          {/* Text Area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something about the indexed reports or upload a file..."
            style={styles.textarea}
            rows="1"
            disabled={loading}
          />

          {/* Send Action Button */}
          <button
            type="submit"
            style={{
              ...styles.sendButton,
              ...(!text.trim() && !file ? styles.sendDisabled : {}),
            }}
            disabled={loading || (!text.trim() && !file)}
          >
            <svg
              style={styles.sendIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  inputContainer: {
    padding: "16px 24px",
    backgroundColor: "transparent",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  previewBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  imagePreview: {
    height: "60px",
    width: "60px",
    objectFit: "cover",
    borderRadius: "6px",
  },
  pdfPreview: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pdfIcon: {
    width: "20px",
    height: "20px",
    color: "#ef4444",
  },
  previewName: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: "500",
  },
  removeButton: {
    background: "none",
    border: "none",
    color: "#ef4444",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0 8px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    gap: "10px",
  },
  attachButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      color: "#fff",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
  },
  attachIcon: {
    width: "20px",
    height: "20px",
  },
  hiddenInput: {
    display: "none",
  },
  textarea: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "15px",
    fontFamily: "inherit",
    resize: "none",
    padding: "8px 0",
    lineHeight: "1.5",
  },
  sendButton: {
    background: "none",
    border: "none",
    color: "#5865F2",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover:not(:disabled)": {
      color: "#818cf8",
      backgroundColor: "rgba(88, 101, 242, 0.1)",
    },
  },
  sendDisabled: {
    color: "#475569",
    cursor: "default",
  },
  sendIcon: {
    width: "20px",
    height: "20px",
  },
};

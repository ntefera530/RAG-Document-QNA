import { useState, useRef, useEffect } from "react";
import { uploadDocument, getAllDocuments, askQuestion, deleteDocument } from "./services/api";
import "./App.css";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(null);
    try {
      const doc = await uploadDocument(file);
      setUploadSuccess(doc.fileName);
      await fetchDocuments();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    const userMessage = question;
    setQuestion("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setAsking(true);

    try {
      const res = await askQuestion(userMessage, selectedDoc, sessionId);
      setSessionId(res.sessionId);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.success ? res.answer : res.errorMessage,
        success: res.success
      }]);
    } catch (err) {
      console.error("Question failed", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again.",
        success: false
      }]);
    } finally {
      setAsking(false);
    }
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      if (selectedDoc === docId) setSelectedDoc(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setSelectedDoc(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">DocMind</span>
          </div>
          <p className="tagline">Interrogate your documents with AI</p>
        </div>
      </header>

      <main className="main">
        <div className="grid">

          {/* Upload Panel */}
          <section className="panel upload-panel">
            <h2 className="panel-title">
              <span className="panel-number">01</span>
              Upload Document
            </h2>
            <div
              className={`dropzone ${dragOver ? "drag-over" : ""} ${uploading ? "uploading" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput").click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".txt,.pdf,.md"
                style={{ display: "none" }}
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              {uploading ? (
                <div className="upload-state">
                  <div className="spinner" />
                  <p>Processing document...</p>
                </div>
              ) : (
                <div className="upload-state">
                  <div className="upload-icon">⬆</div>
                  <p className="upload-main">Drop file here or click to browse</p>
                  <p className="upload-sub">Supports .txt, .pdf, .md</p>
                </div>
              )}
            </div>
            {uploadSuccess && (
              <div className="success-banner">
                ✓ <strong>{uploadSuccess}</strong> ingested successfully
              </div>
            )}

            <div className="docs-section">
              <div className="docs-header">
                <h3>Your Documents</h3>
                <button className="refresh-btn" onClick={fetchDocuments}>
                  {loadingDocs ? "..." : "↻ Refresh"}
                </button>
              </div>
              {documents.length === 0 ? (
                <p className="empty-state">No documents yet</p>
              ) : (
                <ul className="doc-list">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className={`doc-item ${selectedDoc === doc.id ? "selected" : ""}`}
                      onClick={() => setSelectedDoc(doc.id === selectedDoc ? null : doc.id)}
                    >
                      <span className="doc-icon">◻</span>
                      <div className="doc-info">
                        <span className="doc-name">{doc.fileName}</span>
                        <span className={`doc-status status-${doc.status.toLowerCase()}`}>
                          {doc.status}
                        </span>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={(e) => handleDelete(e, doc.id)}
                        title="Delete document"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Chat Panel */}
          <section className="panel qa-panel">
            <div className="chat-header">
              <h2 className="panel-title">
                <span className="panel-number">02</span>
                Ask a Question
              </h2>
              {messages.length > 0 && (
                <button className="new-chat-btn" onClick={handleNewChat}>
                  + New Chat
                </button>
              )}
            </div>

            {selectedDoc && (
              <div className="selected-doc-banner">
                ◈ Querying selected document
              </div>
            )}

            {/* Chat Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="placeholder-state">
                  <div className="placeholder-icon">?</div>
                  <p>Upload a document and ask anything about it</p>
                  <p className="placeholder-hint">Tip: Select a document from the left to scope your question</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`message message-${msg.role}`}>
                    <div className="message-label">
                      {msg.role === "user" ? "YOU" : "DOCMIND"}
                    </div>
                    <div className={`message-bubble ${msg.success === false ? "error" : ""}`}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {asking && (
                <div className="message message-assistant">
                  <div className="message-label">DOCMIND</div>
                  <div className="message-bubble thinking">
                    <div className="thinking-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="question-area">
              <textarea
                className="question-input"
                placeholder="Ask anything about your documents... (Ctrl+Enter to send)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleAsk();
                }}
                rows={3}
              />
              <button
                className={`ask-btn ${asking ? "loading" : ""}`}
                onClick={handleAsk}
                disabled={asking || !question.trim()}
              >
                {asking ? (
                  <><div className="btn-spinner" /> Thinking...</>
                ) : (
                  "Send ⟶"
                )}
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
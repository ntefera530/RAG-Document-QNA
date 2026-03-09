import { useState } from "react";
import { uploadDocument, getAllDocuments, askQuestion, deleteDocument } from "./services/api";
import "./App.css";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await askQuestion(question, selectedDoc);
      setAnswer(res);
    } catch (err) {
      console.error("Question failed", err);
    } finally {
      setAsking(false);
    }
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

          {/* Q&A Panel */}
          <section className="panel qa-panel">
            <h2 className="panel-title">
              <span className="panel-number">02</span>
              Ask a Question
            </h2>

            {selectedDoc && (
              <div className="selected-doc-banner">
                ◈ Querying selected document
              </div>
            )}

            <div className="question-area">
              <textarea
                className="question-input"
                placeholder="What would you like to know about your documents?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleAsk();
                }}
                rows={4}
              />
              <button
                className={`ask-btn ${asking ? "loading" : ""}`}
                onClick={handleAsk}
                disabled={asking || !question.trim()}
              >
                {asking ? (
                  <><div className="btn-spinner" /> Thinking...</>
                ) : (
                  "Ask ⟶"
                )}
              </button>
            </div>

            {answer && (
              <div className={`answer-card ${answer.success ? "success" : "error"}`}>
                <div className="answer-header">
                  {answer.success ? "◈ Answer" : "✗ Error"}
                </div>
                <div className="answer-body">
                  {answer.success ? answer.answer : answer.errorMessage}
                </div>
              </div>
            )}

            {!answer && !asking && (
              <div className="placeholder-state">
                <div className="placeholder-icon">?</div>
                <p>Upload a document and ask anything about it</p>
                <p className="placeholder-hint">Tip: Select a document from the left to scope your question</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
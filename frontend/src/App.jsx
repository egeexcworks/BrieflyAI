
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/analyze";
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [".pdf", ".docx", ".txt"];

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function selectFile(selected) {
    if (!selected) return;

    const extension = selected.name
      .slice(selected.name.lastIndexOf("."))
      .toLowerCase();

    if (!ACCEPTED_TYPES.includes(extension)) {
      setError("Choose a PDF, DOCX, or TXT document.");
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("Your document exceeds the 10 MB limit.");
      return;
    }

    if (selected.size === 0) {
      setError("This file is empty. Choose another document.");
      return;
    }

    setFile(selected);
    setResult(null);
    setError("");
  }

  async function analyzeDocument() {
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Document analysis failed.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach BrieflyAI. Make sure the backend and Ollama are running."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark">b.</span>
          <span>briefly<span className="brand-ai">ai</span></span>
        </a>

        <div className="header-right">
          <span className="local-badge">
            <span className="status-dot" />
            Runs locally
          </span>
          <a className="github-link" href="https://github.com/egeexcworks/BrieflyAI" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            DOCUMENT INTELLIGENCE
          </div>
          <h1>
            Less reading.
            <br />
            <span>More understanding.</span>
          </h1>
          <p className="hero-copy">
            Turn lengthy documents into clear summaries, actionable tasks,
            and important dates. Powered by AI running on your machine.
          </p>
        </section>

        <section className="workspace">
          <div className="section-heading">
            <div>
              <h2>Analyze a document</h2>
              <p>Upload a file to extract the information that matters.</p>
            </div>
            <span className="step-label">01 / UPLOAD</span>
          </div>

          <div
            className={`dropzone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              selectFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              hidden
              onChange={(e) => selectFile(e.target.files?.[0])}
            />

            {file ? (
              <>
                <div className="file-icon">↗</div>
                <div className="file-details">
                  <strong>{file.name}</strong>
                  <span>
                    {(file.size / 1024).toFixed(file.size < 1024 * 1024 ? 1 : 0)}
                    {file.size < 1024 * 1024 ? " KB" : " KB"} · Ready to analyze
                  </span>
                </div>
                <button className="change-file" onClick={() => inputRef.current?.click()}>
                  Change file
                </button>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <strong>Drop your document here</strong>
                <span>or browse files on your computer</span>
                <button className="browse-button" onClick={() => inputRef.current?.click()}>
                  Choose a file
                </button>
              </>
            )}
          </div>

          <div className="upload-meta">
            <span>PDF, DOCX, TXT</span>
            <span>Maximum file size: 10 MB</span>
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span>!</span> {error}
            </div>
          )}

          <button
            className="analyze-button"
            disabled={!file || loading}
            onClick={analyzeDocument}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Analyzing document...
              </>
            ) : (
              <>
                Analyze document <span>↗</span>
              </>
            )}
          </button>

          {loading && (
            <p className="loading-note">
              Your local AI is reading the document. This may take a moment.
            </p>
          )}
        </section>

        {result && (
          <section className="results-section">
            <div className="results-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-line" />
                  ANALYSIS COMPLETE
                </div>
                <h2>Your document, simplified.</h2>
                <p className="result-filename">{result.filename}</p>
              </div>
              <button className="secondary-button" onClick={reset}>
                New document +
              </button>
            </div>

            <div className="result-stats">
              <div>
                <span className="stat-number">✓</span>
                <span>Analysis complete</span>
              </div>
              <div>
                <span className="stat-number">
                  {Number(result.characters_analyzed || 0).toLocaleString()}
                </span>
                <span>Characters reviewed</span>
              </div>
              <div>
                <span className="stat-number">Local</span>
                <span>AI processing</span>
              </div>
            </div>

            <article className="analysis-card">
              <div className="analysis-card-heading">
                <span className="analysis-symbol">b.</span>
                <div>
                  <strong>Document insights</strong>
                  <span>Summary, tasks, dates and references</span>
                </div>
              </div>
              <div className="markdown-content">
                <ReactMarkdown>{result.analysis}</ReactMarkdown>
              </div>
              <div className="result-actions">
                <button
                  className="secondary-button"
                  onClick={() => navigator.clipboard.writeText(result.analysis)}
                >
                  Copy analysis
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const blob = new Blob([result.analysis], { type: "text/markdown;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "brieflyai-analysis.md";
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export Markdown ↓
                </button>
              </div>
            </article>

            <p className="accuracy-note">
              AI-generated results can contain mistakes. Verify important dates,
              deadlines, and decisions against the original document.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <a className="footer-brand" href="#" onClick={(e) => e.preventDefault()}>brieflyai</a>
        <span>Private by design. Powered by your local AI.</span>
        <span>Built for clarity.</span>
      </footer>
    </div>
  );
}

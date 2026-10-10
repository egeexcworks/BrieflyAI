import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "https://brieflyai-api.onrender.com/api/analyze";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export default function App() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function validateFile(selectedFile) {
    if (!selectedFile) return "Please select a document.";

    const extension = selectedFile.name
      .slice(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return "Unsupported file type. Choose a PDF, DOCX, or TXT file.";
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return "The file is too large. Maximum size is 10 MB.";
    }

    if (selectedFile.size === 0) {
      return "This file is empty. Please choose another document.";
    }

    return "";
  }

  function selectFile(selectedFile) {
    const validationError = validateFile(selectedFile);

    setError(validationError);
    setResult(null);

    if (validationError) {
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  function handleInputChange(event) {
    selectFile(event.target.files?.[0] ?? null);
    // Allow selecting the same file again after an error.
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function analyzeDocument() {
    if (!file || loading) return;

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Request failed with status ${response.status}.`
        );
      }

      if (!data.analysis) {
        throw new Error("The API returned no analysis. Please try again.");
      }

      setResult({
        filename: data.filename || file.name,
        characters: data.characters_analyzed,
        analysis: data.analysis,
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to BrieflyAI. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyAnalysis() {
    if (!result?.analysis) return;

    try {
      await navigator.clipboard.writeText(result.analysis);
      setError("");
      window.alert("Analysis copied to clipboard.");
    } catch {
      setError(
        "Clipboard access was blocked by your browser. You can select and copy the result manually."
      );
    }
  }

  function exportMarkdown() {
    if (!result?.analysis) return;

    const markdown = [
      `# BrieflyAI Analysis`,
      ``,
      `**Document:** ${result.filename}`,
      ``,
      result.analysis,
      ``,
      `---`,
      `Generated with BrieflyAI`,
    ].join("\n");

    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = result.filename.replace(/\.[^.]+$/, "");

    link.href = url;
    link.download = `${safeName || "document"}-analysis.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetAnalysis() {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="BrieflyAI home">
          <span className="brand-mark">b.</span>
          <span>Briefly<span className="brand-light">AI</span></span>
        </a>

        <a
          className="github-link"
          href="https://github.com/egeexcworks/BrieflyAI"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <span className="status-dot" />
          DOCUMENT INTELLIGENCE
        </div>

        <h1>
          Read less.
          <br />
          <span>Understand more.</span>
        </h1>

        <p className="hero-description">
          Turn long documents into clear summaries, actionable tasks,
          important dates, and source references.
        </p>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div>
            <span className="step-label">01 / UPLOAD</span>
            <h2>Your document</h2>
          </div>
          <span className="file-limit">MAX 10 MB</span>
        </div>

        <input
          ref={inputRef}
          className="hidden-input"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleInputChange}
          aria-label="Choose a document"
        />

        <div
          className={`dropzone ${dragging ? "dropzone-active" : ""} ${
            file ? "dropzone-selected" : ""
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDragging(false);
            }
          }}
          onDrop={handleDrop}
        >
          {file ? (
            <>
              <div className="file-icon" aria-hidden="true">
                {file.name.toLowerCase().endsWith(".pdf")
                  ? "PDF"
                  : file.name.toLowerCase().endsWith(".docx")
                    ? "DOC"
                    : "TXT"}
              </div>

              <div className="selected-file">
                <strong title={file.name}>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(1)} KB · Ready to analyze</span>
              </div>

              <button
                className="remove-file"
                type="button"
                onClick={resetAnalysis}
                aria-label="Remove selected file"
              >
                ×
              </button>
            </>
          ) : (
            <div className="dropzone-content">
              <div className="upload-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="30"
                  height="30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
                </svg>
              </div>

              <h3>Drop your document here</h3>
              <p>or choose a file from your computer</p>

              <button
                className="browse-button"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Browse files
              </button>

              <span className="supported-formats">
                PDF <i /> DOCX <i /> TXT
              </span>
            </div>
          )}
        </div>

        <button
          className="analyze-button"
          type="button"
          onClick={analyzeDocument}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing document...
            </>
          ) : (
            <>
              Analyze document <span aria-hidden="true">↗</span>
            </>
          )}
        </button>

        {loading && (
          <div className="loading-note" role="status">
            <span>This can take a little while, especially on a free service.</span>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}
      </section>

      {result && (
        <section className="results-section">
          <div className="section-heading results-heading">
            <div>
              <span className="step-label">02 / RESULTS</span>
              <h2>Your document, clarified.</h2>
              <p className="result-filename">{result.filename}</p>
            </div>

            <div className="result-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={copyAnalysis}
              >
                Copy
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={exportMarkdown}
              >
                Export .md
              </button>
            </div>
          </div>

          <article className="analysis-card">
            <div className="analysis-content">
              <ReactMarkdown>{result.analysis}</ReactMarkdown>
            </div>

            {typeof result.characters === "number" && (
              <footer className="analysis-footer">
                {result.characters.toLocaleString()} characters processed
              </footer>
            )}
          </article>

          <button
            className="start-over-button"
            type="button"
            onClick={resetAnalysis}
          >
            ← Analyze another document
          </button>
        </section>
      )}

      <footer className="site-footer">
        <a href="https://github.com/egeexcworks/BrieflyAI">
          BrieflyAI
        </a>
        <span>Built to make long documents easier to understand.</span>
      </footer>
    </main>
  );
}
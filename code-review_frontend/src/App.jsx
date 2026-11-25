
import { useState, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import SecurityAuditDrawer from "./components/SecurityAuditDrawer";

const API_BASE_URL = "http://localhost:3000/ai";

function getLineOffsets(text, lineStart, lineEnd) {
  const lines = text.split("\n");
  const safeStartLine = Math.max(1, Math.min(lines.length, Number(lineStart) || 1));
  const safeEndLine = Math.max(safeStartLine, Math.min(lines.length, Number(lineEnd) || safeStartLine));

  let start = 0;
  for (let i = 0; i < safeStartLine - 1; i++) {
    start += (lines[i]?.length ?? 0) + 1;
  }

  let end = start;
  for (let i = safeStartLine - 1; i < safeEndLine; i++) {
    end += (lines[i]?.length ?? 0) + 1;
  }

  return { start, end: Math.max(start, end - 1) };
}

function App() {
  const [code, setCode] = useState("");
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [followUps, setFollowUps] = useState([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [activeVuln, setActiveVuln] = useState(null);

  const sessionId = useRef(crypto.randomUUID());
  const textareaRef = useRef(null);

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert("Please enter some code!");
      return;
    }

    setLoading(true);
    setError(null);
    setReview(null);
    setFollowUps([]);
    setActiveVuln(null);
    sessionId.current = crypto.randomUUID();

    try {
      const response = await axios.post(`${API_BASE_URL}/get-review`, { code });
      setReview(response.data.data);
      if (response.data.sessionId) {
        sessionId.current = response.data.sessionId;
      }
    } catch (err) {
      alert(`Failed to fetch review. Make sure your API is running. ${err}`);
      setError("Failed to fetch review. Make sure your API is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    const question = followUpInput.trim();
    if (!question || followUpLoading) return;

    setFollowUpInput("");
    setFollowUpLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/follow-up`, {
        sessionId: sessionId.current,
        question,
      });
      setFollowUps((prev) => [...prev, { question, answer: response.data.data }]);
    } catch {
      setFollowUps((prev) => [
        ...prev,
        { question, answer: "⚠️ Failed to get follow-up answer." },
      ]);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleSecurityAudit = async () => {
    if (!code.trim()) {
      alert("Paste some code first.");
      return;
    }

    setAuditLoading(true);
    setAuditError(null);
    setAuditData(null);
    setActiveVuln(null);
    setSeverityFilter("All");

    try {
      const response = await axios.post(`${API_BASE_URL}/security-audit`, { code });
      setAuditData(response.data.data);
      setDrawerOpen(true);
    } catch {
      setAuditError("Security audit failed. Make sure your API is running.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleVulnClick = (finding) => {
    setActiveVuln(finding.id);

    if (
      finding.lineStart !== null &&
      finding.lineStart !== undefined &&
      textareaRef.current
    ) {
      const lineEnd = finding.lineEnd ?? finding.lineStart;
      const { start, end } = getLineOffsets(code, finding.lineStart, lineEnd);
      const textarea = textareaRef.current;

      textarea.focus();
      textarea.setSelectionRange(start, end);

      const lineCount = code.split("\n").length || 1;
      const lineHeight = textarea.scrollHeight / lineCount;
      textarea.scrollTop = lineHeight * Math.max(0, finding.lineStart - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 font-sans text-white">
      <h1 className="mb-6 text-center text-3xl font-bold">AI Code Reviewer</h1>

      <div className="flex min-h-[80vh] items-start gap-4">
        {/* Left Side: Code Input */}
        <div className="flex flex-1 flex-col">
          <h2 className="mb-2 text-xl font-semibold">Code Input</h2>

          <textarea
            ref={textareaRef}
            className={`min-h-[60vh] w-full resize-none rounded-lg border-2 bg-gray-800 p-4 font-mono text-white transition-colors ${
              activeVuln ? "border-amber-500" : "border-transparent"
            }`}
            placeholder="Paste or write your code here..."
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setActiveVuln(null);
            }}
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Reviewing..." : "Get Review"}
          </button>

          <button
            type="button"
            onClick={handleSecurityAudit}
            disabled={auditLoading}
            className="mt-2 rounded-lg bg-purple-600 px-6 py-2 transition hover:bg-purple-700 disabled:opacity-50"
          >
            {auditLoading ? "Scanning..." : "Security Audit"}
          </button>

          {auditData && !auditLoading && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="mt-1 rounded-lg bg-gray-700 px-4 py-1 text-sm transition hover:bg-gray-600"
            >
              View Audit ({auditData.findings?.length ?? 0} findings)
            </button>
          )}

          {error && <p className="mt-2 text-red-500">{error}</p>}
          {auditError && <p className="mt-2 text-sm text-red-500">{auditError}</p>}
        </div>

        {/* Right Side: Code Review */}
        <div className="flex flex-1 flex-col">
          <h2 className="mb-2 text-xl font-semibold">Code Review</h2>

          <div className="prose max-w-full min-h-[60vh] overflow-auto rounded-lg bg-gray-800 p-4">
            {review ? (
              <>
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                  {review}
                </ReactMarkdown>

                {followUps.map((item, index) => (
                  <div
                    key={`${item.question}-${index}`}
                    className="mt-4 border-t border-gray-600 pt-4"
                  >
                    <p className="mb-1 font-semibold text-blue-400">
                      Q: {item.question}
                    </p>
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {item.answer}
                    </ReactMarkdown>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-400">Your code review will appear here...</p>
            )}
          </div>

          {review && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg bg-gray-800 p-2 text-white"
                placeholder="Ask a follow-up question..."
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !followUpLoading) {
                    handleFollowUp();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleFollowUp}
                disabled={followUpLoading}
                className="rounded-lg bg-green-600 px-4 py-2 transition hover:bg-green-700 disabled:opacity-50"
              >
                {followUpLoading ? "..." : "Ask"}
              </button>
            </div>
          )}
        </div>
      </div>

      <SecurityAuditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        auditData={auditData}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        activeVuln={activeVuln}
        onVulnClick={(finding) => {
          handleVulnClick(finding);
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}

export default App;
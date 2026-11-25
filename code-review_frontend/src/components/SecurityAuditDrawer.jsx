import React,{useMemo} from "react";
import SecurityScoreGauge from "./SecurityScoreGauge";
import VulnerabilityCard from "./VulnerabilityCard";

const FILTERS = ["All", "Critical", "Warning", "Informational"];

const SORT_ORDER = {
  Critical: 0,
  Warning: 1,
  Informational: 2,
};

function SecurityAuditDrawer({
  open,
  onClose,
  auditData,
  severityFilter,
  setSeverityFilter,
  activeVuln,
  onVulnClick,
}) {
  const { score = 0, summary = "", findings = [] } = auditData || {};

  const counts = useMemo(() => {
    return findings.reduce(
      (acc, f) => {
        if (acc[f.severity] !== undefined) {
          acc[f.severity] += 1;
        }
        return acc;
      },
      { Critical: 0, Warning: 0, Informational: 0 }
    );
  }, [findings]);

  const sortedFindings = useMemo(() => {
    const filtered =
      severityFilter === "All"
        ? findings
        : findings.filter((f) => f.severity === severityFilter);

    return [...filtered].sort(
      (a, b) => (SORT_ORDER[a.severity] ?? 3) - (SORT_ORDER[b.severity] ?? 3)
    );
  }, [findings, severityFilter]);

  if (!open || !auditData) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-audit-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-50 flex h-full w-full max-w-md flex-col overflow-hidden bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 id="security-audit-title" className="text-lg font-bold text-white">
            Security Audit
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Security Audit"
            className="px-2 text-xl font-bold leading-none text-gray-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Score Gauge */}
        <SecurityScoreGauge score={score} />

        {/* Summary */}
        {summary && (
          <p className="px-4 pb-3 text-center text-sm text-gray-400">
            {summary}
          </p>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {FILTERS.map((filter) => {
            const count = filter === "All" ? findings.length : counts[filter] ?? 0;
            const isActive = severityFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSeverityFilter(filter)}
                className={`rounded px-2.5 py-1 text-xs transition ${
                  isActive
                    ? "bg-gray-600 font-bold text-white"
                    : "bg-gray-800 font-normal text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                }`}
              >
                {filter} ({count})
              </button>
            );
          })}
        </div>

        {/* Findings List */}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {sortedFindings.length === 0 ? (
            <p className="mt-8 text-center text-sm text-gray-500">
              {findings.length === 0
                ? "No vulnerabilities found."
                : "No findings match this filter."}
            </p>
          ) : (
            sortedFindings.map((finding) => (
              <VulnerabilityCard
                key={finding.id}
                finding={finding}
                isActive={activeVuln === finding.id}
                onClick={() => onVulnClick(finding)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SecurityAuditDrawer;
function SecurityScoreGauge({ score = 0 }) {
  const clampedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore >= 70 ? "#22c55e" : clampedScore >= 40 ? "#f59e0b" : "#ef4444";
  const label =
    clampedScore >= 70 ? "Secure" : clampedScore >= 40 ? "At Risk" : "Critical";

  return (
    <div className="flex flex-col items-center py-4">
      <svg
        width="140"
        height="90"
        viewBox="0 0 140 90"
        role="img"
        aria-label={`Security score: ${clampedScore} out of 100 (${label})`}
      >
        {/* Background track */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke="#374151"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Active progress arc */}
        <path
          d="M 10 70 A 60 60 0 0 1 130 70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />

        {/* Score readout */}
        <text
          x="70"
          y="60"
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="bold"
        >
          {clampedScore}
        </text>

        {/* Max score label */}
        <text
          x="70"
          y="76"
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="11"
        >
          / 100
        </text>
      </svg>

      <span className="mt-1 text-sm font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export default SecurityScoreGauge;
import { tierLabel } from "@/config/contracts";

export default function ScoreRing({ score, tier }: { score: number; tier: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, (score / 1000) * 100);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle className="score-ring-track" cx="90" cy="90" r={radius} strokeWidth="10" />
        <circle
          className="score-ring-fill"
          cx="90" cy="90" r={radius} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
        />
        <text x="90" y="86" textAnchor="middle" fontSize="36" fontWeight="800" fill="var(--text-primary)">
          {score}
        </text>
        <text x="90" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-muted)" letterSpacing="0.05em">
          {tierLabel(tier).toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

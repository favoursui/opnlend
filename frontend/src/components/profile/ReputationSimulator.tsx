import { usePosition } from "@/hooks/usePool";
import { useCreditScore } from "@/hooks/useCreditScore";
import { useOraclePrice } from "@/hooks/useOracle";

const TIERS = [
  { name: "High Risk", mult: 0.5,  aprLabel: "12.38%", className: "tier-high-risk", tierIndex: 0 },
  { name: "Subprime",  mult: 0.75, aprLabel: "7.38%",  className: "tier-subprime",  tierIndex: 1 },
  { name: "Neutral",   mult: 1.0,  aprLabel: "4.38%",  className: "tier-neutral",   tierIndex: 2 },
  { name: "Prime",     mult: 1.5,  aprLabel: "2.38%",  className: "tier-prime",     tierIndex: 3 },
];

export default function ReputationSimulator() {
  const { rawCollateral } = usePosition();
  const { tier } = useCreditScore();
  const { priceUsd } = useOraclePrice();

  const collateralOpn = Number(rawCollateral) / 1e18;
  const CF = 0.75;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Reputation simulator</div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          If your score moved to each tier, here's what would change. Available now:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            ${(collateralOpn * CF * (TIERS[tier]?.mult ?? 1) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </strong>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
        {TIERS.map((t) => {
          const limit = collateralOpn * CF * t.mult * priceUsd;
          const isCurrent = t.tierIndex === tier;
          return (
            <div
              key={t.name}
              style={{
                border: isCurrent ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                background: isCurrent ? "var(--accent-dim)" : "var(--bg-secondary)",
                borderRadius: 10,
                padding: "0.875rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: "0.8125rem" }}>{t.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>×{t.mult}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.125rem", marginTop: "0.5rem" }}>
                ${limit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                APR {t.aprLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

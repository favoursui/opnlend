import { useCreditScore } from "@/hooks/useCreditScore";

export default function ScoreBreakdown() {
  const { breakdown } = useCreditScore();

  if (!breakdown) return null;

  const rows = [
    { label: "Baseline", value: breakdown.baseline, positive: true },
    { label: "Active wallet (tx ≥ 10)", value: breakdown.activeWalletBonus, positive: true },
    { label: "Loan repayment history", value: breakdown.repaymentBonus, positive: true },
    { label: "Supply history", value: breakdown.supplyBonus, positive: true },
    { label: "Collateral deposits", value: breakdown.depositBonus, positive: true },
    { label: "Borrow history", value: breakdown.borrowBonus, positive: true },
    { label: "Long-term wallet (≥ 180d)", value: breakdown.longtermBonus, positive: true },
    { label: "Liquidations", value: -breakdown.liquidationPenalty, positive: false },
  ];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>How your score is computed</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: r.value === 0 ? "var(--text-muted)" : "var(--text-secondary)" }}>{r.label}</span>
            <span
              style={{
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: r.value === 0 ? "var(--text-muted)" : r.positive ? "var(--accent)" : "var(--danger)",
              }}
            >
              {r.value > 0 ? "+" : ""}{r.value}
            </span>
          </div>
        ))}
      </div>

      <div className="divider" />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9375rem", fontWeight: 700 }}>
        <span>Total (clamped 0–1000)</span>
        <span>{breakdown.total}</span>
      </div>
    </div>
  );
}

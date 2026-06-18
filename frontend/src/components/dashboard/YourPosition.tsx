import { usePosition } from "@/hooks/usePool";
import { useCreditScore } from "@/hooks/useCreditScore";
import { useOraclePrice } from "@/hooks/useOracle";
import { formatHF, tierLabel, tierMultiplier } from "@/config/contracts";

export default function YourPosition() {
  const { collateral, debt, limit, hf, borrowAprPct } = usePosition();
  const { tier } = useCreditScore();
  const { priceUsd } = useOraclePrice();

  const hfDisplay = formatHF(hf);
  const hfNum = hfDisplay === "∞" ? Infinity : Number(hfDisplay);
  const hfClass = hfNum === Infinity ? "hf-safe" : hfNum >= 1.5 ? "hf-safe" : hfNum >= 1.1 ? "hf-warn" : "hf-danger";

  const stats = [
    { label: "Collateral", value: `${collateral} IOPN`, sub: `$${(Number(collateral) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    { label: "Borrow Limit", value: `$${(Number(limit) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `CF 75% × rep ${tierMultiplier(tier)}` },
    { label: "Debt", value: `$${(Number(debt) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `Borrow APR ${borrowAprPct}%` },
    { label: "Health Factor", value: hfDisplay, sub: debt === "0.0000" ? "No debt" : "Liquidation < 1.0", valueClass: hfClass },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <div className="label">Your Position</div>
        <span className={`tier-badge tier-${tierLabel(tier).toLowerCase().replace(" ", "-")}`}>
          {tierLabel(tier)} · {tierMultiplier(tier)}
        </span>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="label">{s.label}</div>
            <div className={`value ${s.valueClass ?? ""}`} style={{ marginTop: "0.375rem", fontSize: "1.375rem" }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

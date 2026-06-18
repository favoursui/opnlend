import { usePoolStats } from "@/hooks/usePool";
import { useOraclePrice } from "@/hooks/useOracle";

export default function PoolOverview() {
  const { totalSupplied, totalBorrowed, utilisationPct } = usePoolStats();
  const { priceUsd } = useOraclePrice();

  const stats = [
    { label: "Total Supplied", value: `$${(Number(totalSupplied) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `${totalSupplied} IOPN` },
    { label: "Total Borrowed", value: `$${(Number(totalBorrowed) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `Utilisation ${utilisationPct}%` },
    { label: "IOPN Price",     value: `$${priceUsd.toFixed(2)}`, sub: "Oracle feed" },
    { label: "Liquidation Threshold", value: "83.00%", sub: "8% bonus" },
  ];

  return (
    <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {stats.map((s) => (
        <div key={s.label} className="card">
          <div className="label">{s.label}</div>
          <div className="value" style={{ marginTop: "0.375rem", fontSize: "1.375rem" }}>{s.value}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { useProtocolStats } from "@/hooks/useProtocolStats";

export default function StatsOverview() {
  const { stats, loading } = useProtocolStats();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!stats || !canvasRef.current || stats.history.length === 0) return;

    let chart: any;
    import("chart.js/auto").then(({ default: Chart }) => {
      if (chartRef.current) chartRef.current.destroy();

      const labels = stats.history.map((h) =>
        new Date(h.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      );

      chart = new Chart(canvasRef.current!, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Total supplied",
              data: stats.history.map((h) => h.totalSupplied),
              borderColor: "#00e5a0",
              backgroundColor: "rgba(0,229,160,0.08)",
              fill: true,
              tension: 0.3,
              pointRadius: 2,
            },
            {
              label: "Total borrowed",
              data: stats.history.map((h) => h.totalBorrowed),
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245,158,11,0.08)",
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              borderDash: [4, 3],
            },
            {
              label: "Total collateral deposited",
              data: stats.history.map((h) => h.totalCollateral),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59,130,246,0.08)",
              fill: true,
              tension: 0.3,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#4a7a7a", maxRotation: 0, autoSkip: true }, grid: { color: "#1a3030" } },
            y: { beginAtZero: true, ticks: { color: "#4a7a7a", callback: (v: any) => v + " IOPN" }, grid: { color: "#1a3030" } },
          },
        },
      });
      chartRef.current = chart;
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        Loading protocol stats…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        No protocol data available yet.
      </div>
    );
  }

  const metrics = [
    { label: "Total Supplied", value: `${stats.totalSupplied} IOPN` },
    { label: "Total Borrowed", value: `${stats.totalBorrowed} IOPN` },
    { label: "Total Collateral Deposited", value: `${stats.totalCollateral} IOPN` },
    { label: "Protocol Transactions", value: stats.totalTransactions.toString() },
    { label: "Total Users", value: stats.totalUsers.toString() },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {metrics.map((m) => (
          <div key={m.label} className="card">
            <div className="label">{m.label}</div>
            <div className="value" style={{ marginTop: "0.375rem", fontSize: "1.375rem" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {stats.history.length > 0 ? (
        <div className="card">
          <div style={{ display: "flex", gap: "1.25rem", marginBottom: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#00e5a0", display: "inline-block" }} />
              Total supplied
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b", display: "inline-block" }} />
              Total borrowed
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />
              Total collateral deposited
            </span>
          </div>
          <div style={{ position: "relative", height: 280 }}>
            <canvas ref={canvasRef} role="img" aria-label="Line chart of total supplied, borrowed, and collateral deposited IOPN over time" />
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          Not enough activity yet to plot history.
        </div>
      )}
    </div>
  );
}
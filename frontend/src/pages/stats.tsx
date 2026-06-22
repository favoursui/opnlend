import Head from "next/head";
import { BarChart3 } from "lucide-react";
import StatsOverview from "@/components/stats/StatsOverview";

export default function Stats() {
  return (
    <>
      <Head><title>Stats | OPNLend</title></Head>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "var(--accent-dim)", borderRadius: 8, padding: "0.5rem", display: "flex" }}>
            <BarChart3 size={18} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.375rem", letterSpacing: "-0.02em" }}>Protocol stats</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              Live totals and activity across OPNLend, sourced directly from on-chain events.
            </p>
          </div>
        </div>

        <StatsOverview />
      </div>
    </>
  );
}
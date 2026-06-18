import Head from "next/head";
import { Trophy } from "lucide-react";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";

export default function Leaderboard() {
  return (
    <>
      <Head><title>Leaderboard | OPNLend</title></Head>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "var(--accent-dim)", borderRadius: 8, padding: "0.5rem", display: "flex" }}>
            <Trophy size={18} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.375rem", letterSpacing: "-0.02em" }}>Reputation leaderboard</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>Ranked by credit score across all known wallets.</p>
          </div>
        </div>

        <LeaderboardTable />
      </div>
    </>
  );
}

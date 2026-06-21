import Head from "next/head";
import { useAccount } from "wagmi";
import CreditScorePanel from "@/components/profile/CreditScorePanel";
import ScoreBreakdown from "@/components/profile/ScoreBreakdown";
import ReputationSimulator from "@/components/profile/ReputationSimulator";

export default function Profile() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "1rem", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem" }}>🔒</div>
        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Connect your wallet</div>
        <div style={{ fontSize: "0.875rem" }}>Your credit profile lives on-chain — connect to see it.</div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Profile | OPNLend</title></Head>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
        <CreditScorePanel />
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <ScoreBreakdown />
          <ReputationSimulator />
        </div>
      </div>
    </>
  );
}

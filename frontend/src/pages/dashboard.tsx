import Head from "next/head";
import PoolOverview from "@/components/dashboard/PoolOverview";
import YourPosition from "@/components/dashboard/YourPosition";
import CollateralPanel from "@/components/dashboard/CollateralPanel";
import BorrowRepayPanel from "@/components/dashboard/BorrowRepayPanel";
import SupplyPanel from "@/components/dashboard/SupplyPanel";
import LiquidationsPanel from "@/components/dashboard/LiquidationsPanel";

export default function Dashboard() {
  return (
    <>
      <Head><title>Dashboard | OPNLend</title></Head>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.625rem", letterSpacing: "-0.02em" }}>Lending dashboard</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Supply liquidity, deposit collateral, and borrow against your on-chain reputation.
          </p>
        </div>

        <PoolOverview />
        <YourPosition />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <CollateralPanel />
          <BorrowRepayPanel />
          <SupplyPanel />
          <LiquidationsPanel />
        </div>
      </div>
    </>
  );
}

import Head from "next/head";
import Link from "next/link";
import { ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export default function Landing() {
  return (
    <>
      <Head>
        <title>OPNLend | Borrow against your reputation</title>
        <meta name="description" content="On-chain reputation-based lending on OPN Chain." />
      </Head>

      <div style={{ display: "flex", flexDirection: "column", gap: "3rem", paddingTop: "1rem" }}>
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderRadius: 99,
              padding: "0.3rem 0.875rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--accent)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1.25rem",
            }}
          >
            ⛓ On-chain reputation, version 1
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4.5vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              marginBottom: "1.25rem",
            }}
          >
            Borrow against your{" "}
            <span style={{ color: "var(--accent)" }}>reputation</span>, not just your collateral.
          </h1>

          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "1.75rem" }}>
            A pool-based lending protocol where every wallet has a credit score derived from
            on-chain history. Prime borrowers unlock up to{" "}
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>1.5×</span> collateral factor and
            pay less interest. High-risk wallets get tighter limits and steeper rates.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/dashboard">
              <button className="btn btn-accent" style={{ fontSize: "0.875rem", padding: "0.7rem 1.5rem" }}>
                Launch app →
              </button>
            </Link>
            <Link href="/leaderboard">
              <button className="btn btn-outline" style={{ fontSize: "0.875rem", padding: "0.7rem 1.5rem" }}>
                View leaderboard
              </button>
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div className="card">
            <ShieldCheck size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginTop: "0.75rem" }}>Reputation-weighted limits</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.375rem", lineHeight: 1.5 }}>
              effectiveLimit = collateral × CF × repMultiplier. Tiers from 0.5× to 1.5×.
            </div>
          </div>
          <div className="card">
            <TrendingUp size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginTop: "0.75rem" }}>Dynamic interest rates</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.375rem", lineHeight: 1.5 }}>
              APR = base + utilisation risk − reputation discount. Earn trust, pay less.
            </div>
          </div>
          <div className="card">
            <Wallet size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700, fontSize: "0.875rem", marginTop: "0.75rem" }}>Open pool, single market</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.375rem", lineHeight: 1.5 }}>
              Supply IOPN, deposit IOPN collateral, borrow against it. Liquidations keep it solvent.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

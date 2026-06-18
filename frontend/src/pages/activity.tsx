import Head from "next/head";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Activity as ActivityIcon } from "lucide-react";
import ActivityFeed from "@/components/activity/ActivityFeed";

export default function ActivityPage() {
  const { address, isConnected } = useAccount();
  // Default to the connected user's own platform transactions.
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const account = scope === "mine" && isConnected ? address : undefined;

  return (
    <>
      <Head><title>Activity | OPNLend</title></Head>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ background: "var(--accent-dim)", borderRadius: 8, padding: "0.5rem", display: "flex" }}>
              <ActivityIcon size={18} color="var(--accent)" />
            </div>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: "1.375rem", letterSpacing: "-0.02em" }}>
                {account ? "Your activity" : "Protocol activity"}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                {account ? "Your transactions on OPNLend." : "All OPNLend transactions, including liquidations."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className={scope === "mine" ? "btn btn-accent" : "btn btn-outline"}
              onClick={() => setScope("mine")}
              disabled={!isConnected}
            >
              Mine
            </button>
            <button
              className={scope === "all" ? "btn btn-accent" : "btn btn-outline"}
              onClick={() => setScope("all")}
            >
              All
            </button>
          </div>
        </div>

        {scope === "mine" && !isConnected ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            Connect your wallet to see your transactions.
          </div>
        ) : (
          <ActivityFeed account={account} />
        )}
      </div>
    </>
  );
}

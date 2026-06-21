import { useLeaderboard } from "@/hooks/useLeaderboard";
import { tierLabel, tierClass, shortenAddress } from "@/config/contracts";
import { useAccount } from "wagmi";
import { Crown } from "lucide-react";

const CROWN_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"]; // gold, silver, bronze

export default function LeaderboardTable() {
  const { entries, loading } = useLeaderboard();
  const { address } = useAccount();

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        Loading leaderboard…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        No wallets have interacted with the protocol yet.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Wallet</th>
            <th>Score</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isYou = address && e.address.toLowerCase() === address.toLowerCase();
            const crownColor = i < 3 ? CROWN_COLORS[i] : null;
            return (
              <tr key={e.address}>
                <td style={{ color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    {crownColor && <Crown size={14} color={crownColor} fill={crownColor} />}
                    {i + 1}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {isYou ? "You" : shortenAddress(e.address)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {shortenAddress(e.address)}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>{e.score}</td>
                <td>
                  <span className={`tier-badge ${tierClass(e.tier)}`}>{tierLabel(e.tier)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
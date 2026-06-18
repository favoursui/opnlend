import { useLeaderboard } from "@/hooks/useLeaderboard";
import { tierLabel, tierClass, shortenAddress } from "@/config/contracts";
import { useAccount } from "wagmi";

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
            <th>Activity</th>
            <th>Breakdown</th>
            <th>Score</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isYou = address && e.address.toLowerCase() === address.toLowerCase();
            return (
              <tr key={e.address}>
                <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {isYou ? "You" : shortenAddress(e.address)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    {shortenAddress(e.address)}
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>{e.activity} actions</td>
                <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {e.supplies}S · {e.borrows}B · {e.repays}R{e.liquidations > 0 ? ` · ${e.liquidations}L` : ""}
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

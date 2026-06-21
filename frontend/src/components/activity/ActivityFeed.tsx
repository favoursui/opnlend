import { useActivity } from "@/hooks/useActivity";
import { shortenAddress } from "@/config/contracts";

const TYPE_LABEL: Record<string, string> = {
  SUPPLY: "Supply",
  BORROW: "Borrow",
  REPAY: "Repay",
  LIQUIDATE: "Liquidate",
  CLAIM: "ClaimYield",
};

const TYPE_CLASS: Record<string, string> = {
  SUPPLY: "event-supply",
  BORROW: "event-borrow",
  REPAY: "event-repay",
  LIQUIDATE: "event-liquidate",
  CLAIM: "event-claim",
};


export default function ActivityFeed({ account }: { account?: `0x${string}` }) {
  const { events, loading } = useActivity(account);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        Loading activity…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        {account ? "You have no transactions on OPNLend yet." : "No protocol activity yet."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {events.map((e, i) => (
        <div
          key={`${e.txHash}-${i}`}
          className="card"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <span className={`event-badge ${TYPE_CLASS[e.type]}`}>{TYPE_LABEL[e.type]}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{shortenAddress(e.address)}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {e.type === "LIQUIDATE" ? "Liquidation executed" : "Protocol transaction"}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{e.amount} IOPN</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {new Date(e.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

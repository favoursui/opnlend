import { useAccount } from "wagmi";
import { useCreditScore } from "@/hooks/useCreditScore";
import { tierLabel, tierMultiplier, shortenAddress } from "@/config/contracts";
import ScoreRing from "./ScoreRing";
import { Clock, CheckCircle2, Calendar, AlertTriangle } from "lucide-react";

export default function CreditScorePanel() {
  const { address } = useAccount();
  const { score, tier, walletData } = useCreditScore();

  const walletAgeDays = walletData ? Math.floor((Date.now() / 1000 - walletData.firstSeenTimestamp) / 86400) : 0;

  const stats = [
    { icon: Clock, label: "Tx Count", value: walletData?.txCount ?? 0 },
    { icon: CheckCircle2, label: "Loans Repaid", value: walletData?.totalRepayments ?? 0 },
    { icon: Calendar, label: "Wallet Age", value: `${walletAgeDays}d` },
    { icon: AlertTriangle, label: "Liquidations", value: walletData?.liquidations ?? 0, danger: (walletData?.liquidations ?? 0) > 0 },
  ];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="label">Credit Score</div>

      <ScoreRing score={score} tier={tier} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "0.625rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--text-muted)", fontSize: "0.6875rem" }}>
                <Icon size={11} /> {s.label}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginTop: "0.25rem", color: s.danger ? "var(--danger)" : "var(--text-primary)" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {address && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
          {shortenAddress(address)}
        </div>
      )}
    </div>
  );
}

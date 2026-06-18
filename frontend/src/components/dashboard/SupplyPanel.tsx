import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useSupply, useWithdrawSupply, useClaimYield, useSupplyInfo } from "@/hooks/usePool";
import { ArrowDownToLine, ArrowUpFromLine, Gift } from "lucide-react";

export default function SupplyPanel() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { supplied, shares, yieldEarned, rawYield, supplyAprPct, refetch } = useSupplyInfo();
  const [mode, setMode] = useState<"supply" | "withdraw">("supply");
  const [amount, setAmount] = useState("");

  const { supply, isPending: sPending, isConfirming: sConfirming, isSuccess: sSuccess } = useSupply();
  const { withdrawSupply, isPending: wPending, isConfirming: wConfirming, isSuccess: wSuccess } = useWithdrawSupply();
  const { claimYield, isPending: cPending, isConfirming: cConfirming, isSuccess: cSuccess } = useClaimYield();

  const isPending = mode === "supply" ? sPending : wPending;
  const isConfirming = mode === "supply" ? sConfirming : wConfirming;
  const isSuccess = mode === "supply" ? sSuccess : wSuccess;
  const hasYield = rawYield > 0n;
  const claimBusy = cPending || cConfirming;

  const handleSubmit = () => {
    if (!amount) return;
    if (mode === "supply") supply(amount);
    else withdrawSupply(BigInt(Math.floor(Number(amount) * 1e18)));
  };

  if (isSuccess || cSuccess) refetch();

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>
        <span style={{ color: "var(--accent)" }}>⚡</span> Earn — supply liquidity (IOPN)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <div className="label">Wallet</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            {balance ? Number(balance.formatted).toFixed(4) : "0.0000"} IOPN
          </div>
        </div>
        <div>
          <div className="label">Supplied</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>{supplied} IOPN</div>
        </div>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <div>
          <div className="label" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Gift size={12} color="var(--accent)" /> Yield earned
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginTop: "0.25rem", color: hasYield ? "var(--accent)" : "var(--text-primary)" }}>
            {yieldEarned} IOPN
          </div>
        </div>
        <button
          className="btn btn-accent"
          onClick={() => claimYield()}
          disabled={!isConnected || !hasYield || claimBusy}
        >
          {claimBusy ? "Claiming…" : "Claim"}
        </button>
      </div>

      {cSuccess && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>✓ Yield claimed.</div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className={mode === "supply" ? "btn btn-accent" : "btn btn-outline"} style={{ flex: 1 }} onClick={() => setMode("supply")}>
          <ArrowDownToLine size={14} /> Supply
        </button>
        <button className={mode === "withdraw" ? "btn btn-accent" : "btn btn-outline"} style={{ flex: 1 }} onClick={() => setMode("withdraw")}>
          <ArrowUpFromLine size={14} /> Withdraw
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input className="input" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn btn-accent" onClick={handleSubmit} disabled={!isConnected || !amount || isPending || isConfirming}>
          {isPending || isConfirming ? "Confirming…" : mode === "supply" ? "Supply" : "Withdraw"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span>Max {balance ? Number(balance.formatted).toFixed(4) : "0.0000"} IOPN</span>
        <span>Supply APR <span style={{ color: "var(--accent)", fontWeight: 600 }}>{supplyAprPct}%</span></span>
      </div>

      {isSuccess && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
          ✓ {mode === "supply" ? "Supplied" : "Withdrawn"} successfully.
        </div>
      )}
    </div>
  );
}

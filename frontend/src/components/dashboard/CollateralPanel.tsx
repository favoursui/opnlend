import { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useDepositCollateral, useWithdrawCollateral, usePosition } from "@/hooks/usePool";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export default function CollateralPanel() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { collateral, refetch } = usePosition();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  const { depositCollateral, isPending: depPending, isConfirming: depConfirming, isSuccess: depSuccess } = useDepositCollateral();
  const { withdrawCollateral, isPending: wPending, isConfirming: wConfirming, isSuccess: wSuccess } = useWithdrawCollateral();

  const isPending = mode === "deposit" ? depPending : wPending;
  const isConfirming = mode === "deposit" ? depConfirming : wConfirming;
  const isSuccess = mode === "deposit" ? depSuccess : wSuccess;

  const handleSubmit = () => {
    if (!amount) return;
    if (mode === "deposit") depositCollateral(amount);
    else withdrawCollateral(amount);
  };

  if (isSuccess) refetch();

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>
          <span style={{ color: "var(--accent)" }}>⛓</span> Collateral (IOPN)
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <div className="label">Wallet</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            {balance ? Number(balance.formatted).toFixed(4) : "0.0000"} IOPN
          </div>
        </div>
        <div>
          <div className="label">Deposited</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>{collateral} IOPN</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className={mode === "deposit" ? "btn btn-accent" : "btn btn-outline"}
          style={{ flex: 1 }}
          onClick={() => setMode("deposit")}
        >
          <ArrowDownToLine size={14} /> Deposit
        </button>
        <button
          className={mode === "withdraw" ? "btn btn-accent" : "btn btn-outline"}
          style={{ flex: 1 }}
          onClick={() => setMode("withdraw")}
        >
          <ArrowUpFromLine size={14} /> Withdraw
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          className="input"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className="btn btn-accent"
          onClick={handleSubmit}
          disabled={!isConnected || !amount || isPending || isConfirming}
        >
          {isPending || isConfirming ? "Confirming…" : mode === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      </div>

      {mode === "deposit" && balance && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          Max {Number(balance.formatted).toFixed(4)} IOPN
        </div>
      )}

      {isSuccess && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
          ✓ {mode === "deposit" ? "Deposited" : "Withdrawn"} successfully.
        </div>
      )}
    </div>
  );
}

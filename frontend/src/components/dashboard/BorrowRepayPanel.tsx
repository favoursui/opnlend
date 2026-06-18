import { useState } from "react";
import { useAccount } from "wagmi";
import { usePosition } from "@/hooks/usePool";
import { useBorrow, useRepay } from "@/hooks/useLoanManager";
import { useOraclePrice } from "@/hooks/useOracle";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export default function BorrowRepayPanel() {
  const { isConnected } = useAccount();
  const { debt, limit, refetch } = usePosition();
  const { priceUsd } = useOraclePrice();
  const [mode, setMode] = useState<"borrow" | "repay">("borrow");
  const [amount, setAmount] = useState("");

  const { borrow, isPending: bPending, isConfirming: bConfirming, isSuccess: bSuccess } = useBorrow();
  const { repay, isPending: rPending, isConfirming: rConfirming, isSuccess: rSuccess } = useRepay();

  const isPending = mode === "borrow" ? bPending : rPending;
  const isConfirming = mode === "borrow" ? bConfirming : rConfirming;
  const isSuccess = mode === "borrow" ? bSuccess : rSuccess;

  const availableToBorrow = Math.max(0, Number(limit) - Number(debt));

  const handleSubmit = () => {
    if (!amount) return;
    if (mode === "borrow") borrow(amount);
    else repay(amount);
  };

  if (isSuccess) refetch();

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>
        <span style={{ color: "var(--accent)" }}>◈</span> Borrow / Repay (IOPN)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <div className="label">Available</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            ${(availableToBorrow * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="label">Debt</div>
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginTop: "0.25rem" }}>
            ${(Number(debt) * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className={mode === "borrow" ? "btn btn-accent" : "btn btn-outline"} style={{ flex: 1 }} onClick={() => setMode("borrow")}>
          <ArrowDownToLine size={14} /> Borrow
        </button>
        <button className={mode === "repay" ? "btn btn-accent" : "btn btn-outline"} style={{ flex: 1 }} onClick={() => setMode("repay")}>
          <ArrowUpFromLine size={14} /> Repay
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input className="input" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn btn-accent" onClick={handleSubmit} disabled={!isConnected || !amount || isPending || isConfirming}>
          {isPending || isConfirming ? "Confirming…" : mode === "borrow" ? "Borrow" : "Repay"}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span>Max {availableToBorrow.toFixed(4)} IOPN</span>
        <span>Available to borrow: ${(availableToBorrow * priceUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
      </div>

      {isSuccess && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
          ✓ {mode === "borrow" ? "Borrow" : "Repayment"} confirmed.
        </div>
      )}
    </div>
  );
}

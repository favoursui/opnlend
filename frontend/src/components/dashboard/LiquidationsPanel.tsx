import { useState } from "react";
import { useAccount } from "wagmi";
import { usePosition } from "@/hooks/usePool";
import { useIsLiquidatable, useLiquidate } from "@/hooks/useLiquidator";
import { formatHF, shortenAddress } from "@/config/contracts";

export default function LiquidationsPanel() {
  const { address } = useAccount();
  const [checkAddr, setCheckAddr] = useState("");
  const targetAddr = (checkAddr || address) as `0x${string}` | undefined;

  const { debt, hf } = usePosition();
  const isLiquidatable = useIsLiquidatable(targetAddr);
  const { liquidate, isPending, isConfirming, isSuccess } = useLiquidate();

  const hfDisplay = formatHF(hf);
  const isSafe = hfDisplay === "∞" || Number(hfDisplay) >= 1;

  const handleLiquidate = () => {
    if (!targetAddr || !debt) return;
    liquidate(targetAddr, debt);
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>
        <span style={{ color: "var(--danger)" }}>⚠</span> Liquidations
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        Any position with health factor &lt; 1 can be liquidated. You repay the debt and seize collateral worth debt × (1 + bonus).
      </p>

      <input
        className="input"
        placeholder="Check wallet address (0x...)"
        value={checkAddr}
        onChange={(e) => setCheckAddr(e.target.value)}
      />

      {targetAddr && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-secondary)",
            borderRadius: 8,
            padding: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {checkAddr ? shortenAddress(targetAddr) : "You"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              debt {debt} IOPN · HF {hfDisplay} · {isSafe ? "Safe" : "Liquidatable"}
            </div>
          </div>
          <button
            className="btn btn-danger"
            disabled={!isLiquidatable || isPending || isConfirming}
            onClick={handleLiquidate}
          >
            {isPending || isConfirming ? "Confirming…" : "Liquidate"}
          </button>
        </div>
      )}

      {isSuccess && (
        <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>✓ Liquidation executed.</div>
      )}
    </div>
  );
}

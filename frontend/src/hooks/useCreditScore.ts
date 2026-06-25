import { useEffect, useState } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { useAccount } from "wagmi";
import { CONTRACTS, CREDIT_SCORE_ABI } from "@/config/contracts";

const ACTIVE_WALLET_TX_THRESHOLD = 10;
const ACTIVE_WALLET_BONUS = 25;
const MAX_SCORE = 1000;

export function useCreditScore(overrideAddress?: `0x${string}`) {
  const { address: connected } = useAccount();
  const address = overrideAddress ?? connected;
  const client = usePublicClient();

  // Live OPN-chain transaction count (wallet nonce). The keeper seeds this
  // on-chain periodically; here we read it live so the profile stays fresh.
  const [liveTxCount, setLiveTxCount] = useState<number | null>(null);
  useEffect(() => {
    if (!client || !address) { setLiveTxCount(null); return; }
    let cancelled = false;
    client.getTransactionCount({ address }).then((n) => {
      if (!cancelled) setLiveTxCount(Number(n));
    }).catch(() => { if (!cancelled) setLiveTxCount(null); });
    return () => { cancelled = true; };
  }, [client, address]);

  const { data: score, refetch: refetchScore } = useReadContract({
    address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getScore",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: tier } = useReadContract({
    address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getTier",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: breakdown } = useReadContract({
    address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getScoreBreakdown",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: walletData } = useReadContract({
    address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getWalletData",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: multiplierBps } = useReadContract({
    address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getBorrowMultiplierBps",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const onChainScore = Number(score ?? 0n);
  const storedTxCount = walletData ? Number(walletData[0]) : 0;
  // Effective tx count = the higher of the seeded on-chain value and the live nonce.
  const effectiveTxCount = Math.max(storedTxCount, liveTxCount ?? 0);

  const storedActiveBonus = breakdown ? Number(breakdown[1]) : 0;
  const liveActiveBonus = effectiveTxCount >= ACTIVE_WALLET_TX_THRESHOLD ? ACTIVE_WALLET_BONUS : 0;
  // Overlay the live active-wallet bonus on top of the on-chain score for display.
  const effectiveScore = Math.min(MAX_SCORE, Math.max(0, onChainScore - storedActiveBonus + liveActiveBonus));

  return {
    score: onChainScore,
    effectiveScore,
    tier: Number(tier ?? 2),
    multiplier: multiplierBps ? Number(multiplierBps) / 10000 : 1,
    liveTxCount,
    effectiveTxCount,
    breakdown: breakdown ? {
      baseline: Number(breakdown[0]),
      activeWalletBonus: liveActiveBonus,
      repaymentBonus: Number(breakdown[2]),
      supplyBonus: Number(breakdown[3]),
      depositBonus: Number(breakdown[4]),
      borrowBonus: Number(breakdown[5]),
      longtermBonus: Number(breakdown[6]),
      liquidationPenalty: Number(breakdown[7]),
      total: effectiveScore,
    } : null,
    walletData: walletData ? {
      txCount: effectiveTxCount,
      firstSeenTimestamp: Number(walletData[1]),
      totalRepayments: Number(walletData[2]),
      totalSupplies: Number(walletData[3]),
      totalDeposits: Number(walletData[4]),
      totalBorrows: Number(walletData[5]),
      liquidations: Number(walletData[6]),
      initialized: walletData[8] as boolean,
    } : null,
    refetchScore,
  };
}

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACTS, LENDING_POOL_ABI, CREDIT_SCORE_ABI, formatOPN, formatHF } from "@/config/contracts";

export interface LeaderboardEntry {
  address: `0x${string}`;
  score: number;
  tier: number;
  borrowLimit: string;
  hf: string;
}

export function useLeaderboard() {
  const client = usePublicClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client || !CONTRACTS.lendingPool) return;

    let cancelled = false;

    async function load() {
      if (!client) return;
      setLoading(true);
      try {
        // Discover the wallet set from the permanent protocol_events table via
        // /api/wallets, NOT from a sliding on-chain block window. This is what keeps
        // wallets from disappearing once their last activity is >9000 blocks old.
        const res = await fetch("/api/wallets");
        if (!res.ok) throw new Error("Failed to fetch wallets");
        const { wallets } = await res.json();
        const addresses: string[] = wallets ?? [];

        // Per-wallet score/tier/limit/HF are read LIVE from the contracts so the
        // ranking is always current.
        const results: LeaderboardEntry[] = await Promise.all(
          addresses.map(async (addr) => {
            const address = addr as `0x${string}`;
            const [score, tier, limit, hf] = await Promise.all([
              client.readContract({ address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getScore", args: [address] }),
              client.readContract({ address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getTier", args: [address] }),
              client.readContract({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: "borrowLimit", args: [address] }),
              client.readContract({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: "healthFactor", args: [address] }),
            ]);
            return {
              address,
              score: Number(score),
              tier: Number(tier),
              borrowLimit: formatOPN(limit as bigint, 2),
              hf: formatHF(hf as bigint),
            };
          })
        );

        results.sort((a, b) => b.score - a.score);
        if (!cancelled) setEntries(results);
      } catch (e) {
        console.error("Leaderboard load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return { entries, loading };
}

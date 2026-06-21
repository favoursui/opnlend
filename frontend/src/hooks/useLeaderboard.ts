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

    async function load() {
      setLoading(true);
      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > 9000n ? currentBlock - 9000n : 0n;

        // Discover wallets from Supplied, Borrowed, CollateralDeposited events
        const [suppliedLogs, borrowedLogs, collateralLogs] = await Promise.all([
          client.getLogs({
            address: CONTRACTS.lendingPool,
            event: LENDING_POOL_ABI.find((e) => e.name === "Supplied") as any,
            fromBlock,
            toBlock: "latest",
          }),
          client.getLogs({
            address: CONTRACTS.lendingPool,
            event: LENDING_POOL_ABI.find((e) => e.name === "Borrowed") as any,
            fromBlock,
            toBlock: "latest",
          }),
          client.getLogs({
            address: CONTRACTS.lendingPool,
            event: LENDING_POOL_ABI.find((e) => e.name === "CollateralDeposited") as any,
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        const addresses = new Set<string>();
        [...suppliedLogs, ...borrowedLogs, ...collateralLogs].forEach((log: any) => {
          if (log.args?.user) addresses.add(log.args.user);
        });

        const results: LeaderboardEntry[] = await Promise.all(
          Array.from(addresses).map(async (addr) => {
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
        setEntries(results);
      } catch (e) {
        console.error("Leaderboard load failed:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [client]);

  return { entries, loading };
}
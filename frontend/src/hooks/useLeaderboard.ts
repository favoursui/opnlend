import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACTS, LENDING_POOL_ABI, CREDIT_SCORE_ABI } from "@/config/contracts";

export interface LeaderboardEntry {
  address: `0x${string}`;
  activity: number;   // total OPNLend actions
  supplies: number;
  borrows: number;
  repays: number;
  liquidations: number;
  score: number;
  tier: number;
}

const EVENT_NAMES = ["Supplied", "Borrowed", "Repaid", "CollateralDeposited", "Liquidated"] as const;

export function useLeaderboard() {
  const client = usePublicClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client || !CONTRACTS.lendingPool) return;

    async function load() {
      setLoading(true);
      try {
        const logsByEvent = await Promise.all(
          EVENT_NAMES.map((name) =>
            client.getLogs({
              address: CONTRACTS.lendingPool,
              event: LENDING_POOL_ABI.find((e) => e.name === name) as any,
              fromBlock: 0n,
              toBlock: "latest",
            })
          )
        );

        // Tally platform activity per wallet from on-chain OPNLend events.
        const stats = new Map<string, Omit<LeaderboardEntry, "score" | "tier">>();
        const bump = (addr: string, key: "supplies" | "borrows" | "repays" | "liquidations") => {
          const a = addr as `0x${string}`;
          const cur = stats.get(a) ?? { address: a, activity: 0, supplies: 0, borrows: 0, repays: 0, liquidations: 0 };
          cur[key] += 1;
          cur.activity += 1;
          stats.set(a, cur);
        };

        EVENT_NAMES.forEach((name, i) => {
          for (const log of logsByEvent[i] as any[]) {
            if (name === "Supplied")             bump(log.args.user, "supplies");
            else if (name === "Borrowed")        bump(log.args.user, "borrows");
            else if (name === "Repaid")          bump(log.args.user, "repays");
            else if (name === "CollateralDeposited") bump(log.args.user, "borrows");
            else if (name === "Liquidated")      bump(log.args.borrower, "liquidations");
          }
        });

        const results: LeaderboardEntry[] = await Promise.all(
          Array.from(stats.values()).map(async (s) => {
            const [score, tier] = await Promise.all([
              client.readContract({ address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getScore", args: [s.address] }),
              client.readContract({ address: CONTRACTS.creditScore, abi: CREDIT_SCORE_ABI, functionName: "getTier", args: [s.address] }),
            ]);
            return { ...s, score: Number(score), tier: Number(tier) };
          })
        );

        // Rank purely by platform activity; credit score breaks ties.
        results.sort((a, b) => b.activity - a.activity || b.score - a.score);
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

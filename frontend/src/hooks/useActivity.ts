import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACTS, LENDING_POOL_ABI, formatOPN } from "@/config/contracts";

export interface ActivityEvent {
  type: "SUPPLY" | "BORROW" | "REPAY" | "LIQUIDATE";
  address: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

export function useActivity(account?: `0x${string}`) {
  const client = usePublicClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client || !CONTRACTS.lendingPool) return;

    async function load() {
      setLoading(true);
      try {
        const eventDefs: { name: string; type: ActivityEvent["type"] }[] = [
          { name: "Supplied", type: "SUPPLY" },
          { name: "Borrowed", type: "BORROW" },
          { name: "Repaid", type: "REPAY" },
          { name: "Liquidated", type: "LIQUIDATE" },
        ];

        const allLogs = await Promise.all(
          eventDefs.map(({ name }) =>
            client.getLogs({
              address: CONTRACTS.lendingPool,
              event: LENDING_POOL_ABI.find((e) => e.name === name) as any,
              fromBlock: 0n,
              toBlock: "latest",
            })
          )
        );

        const blockCache = new Map<bigint, number>();
        const results: ActivityEvent[] = [];

        for (let i = 0; i < eventDefs.length; i++) {
          const { type } = eventDefs[i];
          for (const log of allLogs[i] as any[]) {
            let ts = blockCache.get(log.blockNumber);
            if (ts === undefined) {
              const block = await client.getBlock({ blockNumber: log.blockNumber });
              ts = Number(block.timestamp) * 1000;
              blockCache.set(log.blockNumber, ts);
            }
            const amountRaw = type === "LIQUIDATE" ? log.args.debtRepaid : log.args.amount;
            const addr = type === "LIQUIDATE" ? log.args.borrower : log.args.user;
            results.push({
              type,
              address: addr,
              amount: formatOPN(amountRaw, 2),
              timestamp: ts,
              txHash: log.transactionHash,
            });
          }
        }

        const filtered = account
          ? results.filter((r) => r.address.toLowerCase() === account.toLowerCase())
          : results;
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        setEvents(filtered);
      } catch (e) {
        console.error("Activity load failed:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [client, account]);

  return { events, loading };
}

import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { supabase } from "@/lib/supabase";
import { CONTRACTS, LENDING_POOL_ABI, formatOPN } from "@/config/contracts";
import { opnTestnet } from "@/config/wagmi";

const client = createPublicClient({
  chain: opnTestnet,
  transport: http("https://testnet-rpc.iopn.tech"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Live totals straight from the contract (always accurate, no caching needed)
    const [totalSupplied, totalBorrowed, totalCollateral] = await Promise.all([
      client.readContract({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: "totalSupplied" }),
      client.readContract({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: "totalBorrowed" }),
      client.readContract({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: "totalCollateral" }),
    ]);

    // Permanent history from Supabase — no block-range limits since it's already stored
    const { data: events, error } = await supabase
      .from("protocol_events")
      .select("event_name, user_address, amount, timestamp, block_number")
      .order("block_number", { ascending: true });

    if (error) throw error;

    const users = new Set<string>();
    let runningSupply = 0;
    let runningBorrow = 0;
    const history: { timestamp: number; totalSupplied: number; totalBorrowed: number }[] = [];

    for (const e of events ?? []) {
      if (e.user_address) users.add(e.user_address);
      if (e.event_name === "Supplied") runningSupply += e.amount;
      if (e.event_name === "Borrowed") runningBorrow += e.amount;
      if (e.event_name === "Repaid") runningBorrow -= e.amount;
      history.push({ timestamp: e.timestamp, totalSupplied: runningSupply, totalBorrowed: runningBorrow });
    }

    return res.status(200).json({
      totalSupplied: formatOPN(totalSupplied as bigint, 4),
      totalBorrowed: formatOPN(totalBorrowed as bigint, 4),
      totalCollateral: formatOPN(totalCollateral as bigint, 4),
      totalTransactions: events?.length ?? 0,
      totalUsers: users.size,
      history,
    });
  } catch (e: any) {
    console.error("Stats fetch failed:", e);
    return res.status(500).json({ error: e.message || "Failed to load stats" });
  }
}
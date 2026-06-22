import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { supabase } from "@/lib/supabase";
import { CONTRACTS, LENDING_POOL_ABI, formatOPN } from "@/config/contracts";
import { opnTestnet } from "@/config/wagmi";

const EVENT_NAMES = ["Supplied", "Borrowed", "Repaid", "CollateralDeposited", "Liquidated", "YieldClaimed"] as const;

const client = createPublicClient({
  chain: opnTestnet,
  transport: http("https://testnet-rpc.iopn.tech"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protect this endpoint — only Vercel Cron (or you, manually) should call it
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Get last synced block
    const { data: syncState, error: syncErr } = await supabase
      .from("sync_state")
      .select("last_synced_block")
      .eq("id", 1)
      .single();

    if (syncErr) throw syncErr;

    const currentBlock = await client.getBlockNumber();
    let fromBlock = syncState ? BigInt(syncState.last_synced_block) + 1n : 0n;

    // Never query more than 9000 blocks per call (RPC limit), so cap this run
    // and let the next cron tick pick up the rest
    const maxRange = 9000n;
    const toBlock = fromBlock + maxRange < currentBlock ? fromBlock + maxRange : currentBlock;

    if (fromBlock > toBlock) {
      return res.status(200).json({ message: "Already up to date", currentBlock: currentBlock.toString() });
    }

    // 2. Fetch all event types in this range
    const allLogs = await Promise.all(
      EVENT_NAMES.map((name) =>
        client.getLogs({
          address: CONTRACTS.lendingPool,
          event: LENDING_POOL_ABI.find((e) => e.name === name) as any,
          fromBlock,
          toBlock,
        }).catch(() => [])
      )
    );

    // 3. Build rows, fetching block timestamps as needed
    const blockCache = new Map<bigint, number>();
    const rows: any[] = [];

    for (let i = 0; i < EVENT_NAMES.length; i++) {
      const name = EVENT_NAMES[i];
      for (const log of allLogs[i] as any[]) {
        let ts = blockCache.get(log.blockNumber);
        if (ts === undefined) {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          ts = Number(block.timestamp) * 1000;
          blockCache.set(log.blockNumber, ts);
        }

        const addr = name === "Liquidated" ? log.args.borrower : log.args.user;
        const amount = name === "Liquidated" ? log.args.debtRepaid : log.args.amount;

        rows.push({
          event_name: name,
          user_address: (addr ?? "").toLowerCase(),
          amount: amount ? Number(formatOPN(amount, 6)) : 0,
          block_number: Number(log.blockNumber),
          tx_hash: log.transactionHash,
          timestamp: ts,
        });
      }
    }

    // 4. Insert new rows (unique index on tx_hash+event_name prevents duplicates)
    if (rows.length > 0) {
      const { error: insertErr } = await supabase
        .from("protocol_events")
        .upsert(rows, { onConflict: "tx_hash,event_name", ignoreDuplicates: true });
      if (insertErr) throw insertErr;
    }

    // 5. Update sync state
    const { error: updateErr } = await supabase
      .from("sync_state")
      .update({ last_synced_block: Number(toBlock) })
      .eq("id", 1);
    if (updateErr) throw updateErr;

    return res.status(200).json({
      synced: rows.length,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      currentBlock: currentBlock.toString(),
    });
  } catch (e: any) {
    console.error("Sync failed:", e);
    return res.status(500).json({ error: e.message || "Sync failed" });
  }
}
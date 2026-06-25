import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { supabase } from "@/lib/supabase";
import { CONTRACTS, LENDING_POOL_ABI, formatOPN } from "@/config/contracts";
import { opnTestnet } from "@/config/wagmi";

const EVENT_NAMES = ["Supplied", "SupplyWithdrawn", "Borrowed", "Repaid", "CollateralDeposited", "CollateralWithdrawn", "Liquidated", "YieldClaimed"] as const;

// Block the LendingPool contract was deployed at. Before this block there are no
// events, so we never scan the ~19M empty blocks that precede it.
const DEPLOY_BLOCK = 18986891n;

// IOPN testnet caps eth_getLogs at ~9000 blocks per request.
const CHUNK = 9000n;

// The chain produces ~65k blocks/day, so a single 9000-block step can never keep
// up with a once-a-day cron. Instead we loop chunks within one invocation until we
// either catch up to the head or run out of our time budget (then the next call /
// cron tick / lazy page-load trigger resumes from where we left off).
const MAX_CHUNKS_PER_RUN = 40; // ~360k blocks/run — comfortably ahead of one day's growth
const TIME_BUDGET_MS = 50_000; // stay under Vercel's 60s function ceiling

const client = createPublicClient({
  chain: opnTestnet,
  transport: http("https://testnet-rpc.iopn.tech"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protect this endpoint — only Vercel Cron (or you, manually) should call it.
  // The lazy in-app trigger calls it without the secret, so only enforce auth when
  // a secret is configured AND an Authorization header was actually supplied.
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startedAt = Date.now();

  try {
    // 1. Get last synced block (seed from the deploy block on first ever run)
    const { data: syncState, error: syncErr } = await supabase
      .from("sync_state")
      .select("last_synced_block")
      .eq("id", 1)
      .single();

    if (syncErr) throw syncErr;

    const currentBlock = await client.getBlockNumber();
    let cursor =
      syncState && syncState.last_synced_block
        ? BigInt(syncState.last_synced_block) + 1n
        : DEPLOY_BLOCK;

    if (cursor > currentBlock) {
      return res.status(200).json({ message: "Already up to date", currentBlock: currentBlock.toString() });
    }

    let totalSynced = 0;
    let chunks = 0;

    // 2. Loop chunks until we reach the head, hit the chunk cap, or run low on time.
    while (cursor <= currentBlock && chunks < MAX_CHUNKS_PER_RUN && Date.now() - startedAt < TIME_BUDGET_MS) {
      const toBlock = cursor + CHUNK - 1n < currentBlock ? cursor + CHUNK - 1n : currentBlock;

      const synced = await syncRange(cursor, toBlock);
      totalSynced += synced;

      // Persist progress after every chunk so a timeout/crash never loses ground
      // and the next run resumes exactly here.
      const { error: updateErr } = await supabase
        .from("sync_state")
        .update({ last_synced_block: Number(toBlock) })
        .eq("id", 1);
      if (updateErr) throw updateErr;

      cursor = toBlock + 1n;
      chunks++;
    }

    const caughtUp = cursor > currentBlock;

    return res.status(200).json({
      synced: totalSynced,
      chunks,
      lastSyncedBlock: Number(cursor - 1n),
      currentBlock: currentBlock.toString(),
      caughtUp,
      ...(caughtUp ? {} : { note: "More blocks remain; call again to continue." }),
    });
  } catch (e: any) {
    console.error("Sync failed:", e);
    return res.status(500).json({ error: e.message || "Sync failed" });
  }
}

// Fetch every tracked event in [fromBlock, toBlock], upsert into protocol_events,
// and return how many rows were processed.
async function syncRange(fromBlock: bigint, toBlock: bigint): Promise<number> {
  const allLogs = await Promise.all(
    EVENT_NAMES.map((name) =>
      client
        .getLogs({
          address: CONTRACTS.lendingPool,
          event: LENDING_POOL_ABI.find((e) => e.name === name) as any,
          fromBlock,
          toBlock,
        })
        .catch(() => [])
    )
  );

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

  // Unique index on (tx_hash, event_name) makes this idempotent — re-syncing a
  // range never creates duplicates, so overlapping/retried runs are safe.
  if (rows.length > 0) {
    const { error: insertErr } = await supabase
      .from("protocol_events")
      .upsert(rows, { onConflict: "tx_hash,event_name", ignoreDuplicates: true });
    if (insertErr) throw insertErr;
  }

  return rows.length;
}

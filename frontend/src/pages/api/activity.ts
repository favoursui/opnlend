import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

// Maps the stored event_name to the UI's activity type.
const TYPE_BY_EVENT: Record<string, string> = {
  Supplied: "SUPPLY",
  Borrowed: "BORROW",
  Repaid: "REPAY",
  Liquidated: "LIQUIDATE",
  YieldClaimed: "CLAIM",
};

// Reads activity from the permanent protocol_events table (populated by /api/sync)
// instead of a sliding on-chain block window, so events never "age out" and vanish.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const account = typeof req.query.account === "string" ? req.query.account.toLowerCase() : undefined;

    let query = supabase
      .from("protocol_events")
      .select("event_name, user_address, amount, timestamp, tx_hash")
      .in("event_name", Object.keys(TYPE_BY_EVENT))
      .order("timestamp", { ascending: false })
      .limit(500);

    if (account) query = query.eq("user_address", account);

    const { data, error } = await query;
    if (error) throw error;

    const events = (data ?? []).map((e) => ({
      type: TYPE_BY_EVENT[e.event_name] ?? "SUPPLY",
      address: e.user_address,
      // amount is stored as a plain number (6dp) — render with 2dp like before
      amount: Number(e.amount).toFixed(2),
      timestamp: e.timestamp,
      txHash: e.tx_hash,
    }));

    return res.status(200).json({ events });
  } catch (e: any) {
    console.error("Activity fetch failed:", e);
    return res.status(500).json({ error: e.message || "Failed to load activity" });
  }
}

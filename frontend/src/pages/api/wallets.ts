import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

// Returns the distinct set of wallets that have ever interacted with the protocol,
// discovered from the permanent protocol_events table. The leaderboard then reads
// each wallet's *live* score/tier straight from the contracts, so rankings stay
// fresh while the wallet set never shrinks because of RPC block-range limits.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from("protocol_events")
      .select("user_address")
      .not("user_address", "is", null);

    if (error) throw error;

    const wallets = Array.from(
      new Set((data ?? []).map((r) => (r.user_address || "").toLowerCase()).filter((a) => a.startsWith("0x")))
    );

    return res.status(200).json({ wallets });
  } catch (e: any) {
    console.error("Wallets fetch failed:", e);
    return res.status(500).json({ error: e.message || "Failed to load wallets" });
  }
}

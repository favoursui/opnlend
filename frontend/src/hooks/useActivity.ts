import { useEffect, useState } from "react";

export interface ActivityEvent {
  type: "SUPPLY" | "BORROW" | "REPAY" | "LIQUIDATE" | "CLAIM";
  address: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

// Reads from /api/activity (backed by the permanent protocol_events table) instead
// of a sliding on-chain block window. Events no longer disappear once they fall
// outside the RPC's ~9000-block (~3h) range.
export function useActivity(account?: `0x${string}`) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const qs = account ? `?account=${account.toLowerCase()}` : "";
        const res = await fetch(`/api/activity${qs}`);
        if (!res.ok) throw new Error("Failed to fetch activity");
        const data = await res.json();
        if (!cancelled) setEvents(data.events ?? []);
      } catch (e) {
        console.error("Activity load failed:", e);
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [account]);

  return { events, loading };
}

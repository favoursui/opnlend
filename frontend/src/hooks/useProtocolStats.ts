import { useEffect, useState } from "react";

export interface ProtocolStats {
  totalSupplied: string;
  totalBorrowed: string;
  totalCollateral: string;
  totalTransactions: number;
  totalUsers: number;
  history: { timestamp: number; totalSupplied: number; totalBorrowed: number }[];
}

export function useProtocolStats() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("Protocol stats load failed:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { stats, loading };
}
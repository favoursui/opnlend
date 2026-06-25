import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface SyncResult {
  synced?: number;
  chunks?: number;
  lastSyncedBlock?: number;
  currentBlock?: string;
  caughtUp?: boolean;
  message?: string;
  error?: string;
}

// Admin-only manual indexer trigger. Calls /api/sync repeatedly until it reports
// caughtUp, because a single invocation is capped (~360k blocks / 50s) and the
// first run has a large backlog to chew through.
export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function runSync() {
    setSyncing(true);
    setError("");
    setStatus("Starting sync…");

    let totalSynced = 0;
    // Hard cap on loop iterations so a stuck RPC can't spin forever.
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch("/api/sync");
        const data: SyncResult = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || `Sync failed (HTTP ${res.status})`);
          break;
        }

        if (data.message === "Already up to date") {
          setStatus("Already up to date ✓");
          break;
        }

        totalSynced += data.synced ?? 0;
        setStatus(
          `Synced ${totalSynced} events · block ${data.lastSyncedBlock?.toLocaleString()} / ${Number(
            data.currentBlock
          ).toLocaleString()}`
        );

        if (data.caughtUp) {
          setStatus(`Caught up ✓ — ${totalSynced} new event${totalSynced === 1 ? "" : "s"} indexed`);
          break;
        }
        // else loop again to continue the backlog
      } catch (e: any) {
        setError(e?.message || "Network error");
        break;
      }
    }

    setSyncing(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}>
      <button className="btn btn-accent" onClick={runSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <RefreshCw size={15} className={syncing ? "spin" : undefined} />
        {syncing ? "Syncing…" : "Sync now"}
      </button>

      {status && !error && (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{status}</span>
      )}
      {error && (
        <span style={{ fontSize: "0.8125rem", color: "#ff6b6b" }}>{error}</span>
      )}
    </div>
  );
}

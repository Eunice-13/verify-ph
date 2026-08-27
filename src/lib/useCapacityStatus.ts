"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "verifyph-capacity-status";
// Re-check with the server periodically while the tab is open, so the
// banner clears itself once capacity actually frees up without requiring
// a page reload.
const POLL_INTERVAL_MS = 60_000;

export interface CapacityStatus {
  atCapacity: boolean;
  /** ISO timestamp string, or null when atCapacity is false. */
  availableAt: string | null;
}

interface StoredCapacityStatus extends CapacityStatus {
  /** When this value was fetched/stored — used only to decide whether a
   * stale cached "at capacity" reading is still worth showing before the
   * first live fetch resolves; not used for any expiry logic beyond that. */
  fetchedAt: string;
}

function readStoredStatus(): StoredCapacityStatus | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCapacityStatus;
  } catch {
    return null;
  }
}

function writeStoredStatus(status: CapacityStatus): void {
  try {
    const toStore: StoredCapacityStatus = { ...status, fetchedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage can throw in private-browsing/storage-full edge cases —
    // the banner just won't persist across reloads in that case, which is
    // a silent, harmless degradation, not worth surfacing to the user.
  }
}

/**
 * Tracks whether the claim-checker's provider pool is currently fully
 * exhausted, and until when, persisting the last known value in
 * localStorage so a user reopening the site later still sees it
 * immediately (before the first live re-check completes), per the product
 * requirement to "retain the info every time the user opens the website."
 *
 * Fetches the real, current status from GET /api/capacity-status on
 * mount, then re-polls every POLL_INTERVAL_MS while the component stays
 * mounted (effectively "while the site is open"), so a stale "at capacity"
 * banner clears itself once the cooldown actually expires.
 */
export function useCapacityStatus(): CapacityStatus {
  const [status, setStatus] = useState<CapacityStatus>(() => {
    if (typeof window === "undefined") return { atCapacity: false, availableAt: null };
    return readStoredStatus() ?? { atCapacity: false, availableAt: null };
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/capacity-status", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CapacityStatus;
        if (cancelled) return;
        setStatus(data);
        writeStoredStatus(data);
      } catch {
        // Network hiccup checking status — keep showing whatever was last
        // known (from localStorage or an earlier successful poll) rather
        // than clearing it, since a fetch failure says nothing about
        // whether the provider pool itself has recovered.
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Once the stored "availableAt" time has actually passed, stop showing
  // the banner even if the next poll hasn't landed yet — avoids the
  // banner visibly lingering past its own stated time.
  if (status.atCapacity && status.availableAt && new Date(status.availableAt).getTime() <= Date.now()) {
    return { atCapacity: false, availableAt: null };
  }

  return status;
}

/** Formats an ISO timestamp as a short, local, human-readable time for the
 * banner (e.g. "4:15 PM" same-day, or "Aug 27, 4:15 PM" on a different day). */
export function formatAvailableAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isSameDay) return time;

  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

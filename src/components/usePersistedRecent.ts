import { useState, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'standardcheck:recent:';
const MAX_ENTRIES = 8;

/**
 * Persists a small list to localStorage, keyed per-network so switching
 * between StudioNet and Bradbury doesn't mix their histories together.
 *
 * This is deliberately NOT the same thing as the contract's own
 * on-chain history — it's a client-side convenience so a page refresh
 * or a mobile/desktop mode switch (which most browsers implement as a
 * full reload) doesn't wipe what's visible in "This session's checks."
 * The on-chain data is unaffected either way; this only persists what
 * the UI shows locally. If localStorage is unavailable (private
 * browsing, disabled by the user, quota exceeded), this degrades to
 * plain in-memory state — same as before this fix — rather than
 * throwing and breaking the page.
 */
export function usePersistedRecent<T extends { attestation_id: number }>(
  networkKey: string
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${networkKey}`;

  const [recent, setRecentState] = useState<T[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Malformed data, private browsing, or storage disabled — start
      // clean rather than crash the page on load.
      return [];
    }
  });

  // Re-read from storage whenever the network changes, since each
  // network has its own key and the initial useState only ran once on
  // mount for whichever network was active at the time.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setRecentState(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentState([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const addEntry = (entry: T) => {
    setRecentState((prev) => {
      if (prev.some((e) => e.attestation_id === entry.attestation_id)) {
        return prev;
      }
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage write failed (quota, disabled, private mode) — the
        // in-memory list still updates via setRecentState above, so
        // the current page view stays correct even if persistence
        // silently doesn't happen this time.
      }
      return next;
    });
  };

  return { recent, addEntry };
}

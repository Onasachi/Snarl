import { useCallback, useEffect, useState } from "react";
import { useOnline } from "~/hooks/useOnline";
import { fetchDailyCount, reportDailySolved } from "~/net/daily";

/**
 * How many people freed today's rare Snarl. Null means "we cannot say" — no API
 * configured, offline, or the request failed — and the UI then says nothing rather than
 * showing a zero that would read as "nobody".
 */
export function useDailyCount(day: string) {
  const online = useOnline();
  const [freed, setFreed] = useState<number | null>(null);

  useEffect(() => {
    if (!online) return;
    let live = true;
    void fetchDailyCount(day).then((result) => {
      if (live && result) setFreed(result.freed);
    });
    return () => {
      live = false;
    };
  }, [day, online]);

  /** Called once, after the player frees it. The count that comes back includes them. */
  const report = useCallback(
    async (moves: number) => {
      const result = await reportDailySolved(day, moves);
      if (result) setFreed(result.freed);
    },
    [day],
  );

  return { freed, report, online };
}

/** "Freed by 1,284 today", or nothing at all when there is no number to show. */
export const freedByLabel = (freed: number | null, suffix = "today"): string | null =>
  freed === null ? null : `Freed by ${freed.toLocaleString()} ${suffix}`;

/**
 * The Daily Snarl counter. Not deployed yet — this is the shape of the service the client
 * already knows how to call, and it stays dormant until someone sets VITE_API_URL.
 *
 * It holds one number per day: how many people freed that day's rare Snarl. That is all
 * it is for. There is no identity behind a POST, so the count is inflatable by anyone with
 * curl; it is a piece of company ("1,284 others did this today"), never a score, and the
 * capped G$ rewards in Phase 5 must not be paid from it.
 *
 * Deploy with wrangler, bound to a KV namespace called DAILY:
 *   wrangler deploy worker/daily.ts --name snarl-daily
 */

/**
 * The slice of Cloudflare's KV this uses, declared here so the worker typechecks with the
 * rest of the project and without pulling in a dependency it does not otherwise need.
 */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  DAILY: KVNamespace;
  /** Origin allowed to call this. */
  ORIGIN: string;
}

/** Must match src/game/daily.ts exactly: the same date has to mean the same knot. */
function dailySeed(day: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 1_000_000;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Days are local to each player, so "today" spans about 26 hours across the world. A day
 * either side of UTC is accepted, and nothing older: yesterday's count is read-only.
 */
function withinWindow(day: string, now = new Date()): boolean {
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const asked = Date.UTC(y, m - 1, d);
  return Math.abs(asked - utc) <= 24 * 60 * 60 * 1000;
}

const json = (body: unknown, env: Env, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": env.ORIGIN,
      "cache-control": "no-store",
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const read = url.pathname.match(/^\/daily\/([^/]+)$/);
    const write = url.pathname.match(/^\/daily\/([^/]+)\/solved$/);
    const day = (read?.[1] ?? write?.[1]) as string | undefined;

    if (!day || !DAY.test(day)) return json({ error: "bad day" }, env, 400);

    if (request.method === "GET" && read) {
      const freed = Number((await env.DAILY.get(`count:${day}`)) ?? 0);
      return json({ day, seed: dailySeed(day), freed }, env);
    }

    if (request.method === "POST" && write) {
      if (!withinWindow(day)) return json({ error: "day closed" }, env, 409);
      // Read-modify-write races only ever lose a count, which is acceptable for a number
      // that exists to say "you are not alone in here".
      const freed = Number((await env.DAILY.get(`count:${day}`)) ?? 0) + 1;
      await env.DAILY.put(`count:${day}`, String(freed), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
      return json({ day, freed }, env);
    }

    return json({ error: "not found" }, env, 404);
  },
};

/**
 * The Daily Snarl reward (Phase 5 of PLAN.md) is deliberately NOT implemented here.
 *
 * The design offers a small, capped G$ reward for freeing the rare knot. Paying it means
 * a treasury wallet with a key this worker can sign with, and that only makes sense once
 * three things exist:
 *
 *   1. Proof the claimer is a verified unique person — the GoodDollar identity contract's
 *      `getWhitelistedRoot`, read server-side, not a client's word for it.
 *   2. Proof they actually solved today's knot. The seed is derivable from the date, so a
 *      submitted solution can be replayed and checked for zero crossings against this
 *      day's scramble.
 *   3. A funded treasury with a daily cap and a per-root limit, since the identity root is
 *      the only thing standing between the cap and a thousand fresh addresses.
 *
 * Until all three are decided, nothing here promises a reward, and the game's UI does not
 * mention one. Half a payout path, with a key in it, is worse than none.
 */

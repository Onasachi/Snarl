# snarl — build plan

> Untangle a knot. Free a creature. Grow a pond.

Source of truth: the three Claude Design artifacts, unpacked into [`reference/`](reference/).
They are not a sketch — artifact 1 is a **working prototype** and `reference/snarl-lib.js`
is a real engine (geometry, seeded scrambler, hint solver, SVG renderer, WebAudio kit).
The job is to port that engine into a real app, not to invent it.

## 1. What the artifacts actually contain

| File | What it is |
|---|---|
| `reference/01-prototype.html` + `01-prototype-logic.js` | Playable prototype: splash → 3-knot tutorial → puzzle loop → pond, plus Daily Snarl, streak moon, verify/claim sheets, toasts |
| `reference/02-variations.html` | B/C variants for Pond, Puzzle, Claim; the G$ screens (connect+verify, claim card states, gift flow, The Great Untangle); 5 edge states (empty pond, out of nudges, offline, daily already solved, streak dimmed) |
| `reference/03-brand.html` | Brand & style v0.1: logo, app icon, palette, type scale, the "beads & strings" drawing kit, the **10-creature World 1 roster with coordinates**, and a 15-row motion/sound/haptics table with exact timings |
| `reference/snarl-lib.js` | The engine: `THEMES`, `CREATURES` (10), `TUTORIAL` (2), `RARE` (Moon Moth), `crossings`, `countFor`, `fit`, `scramble`, `nudge`, `svg`, `Audio`, `buzz` |

**Core mechanic:** planarity. Each creature is authored as its true planar shape on a
100×100 grid; `scramble(creature, seed)` permutes/rotates the beads into a tangle inside a
target crossing band; the puzzle is solved when `crossings(pos, edges).length === 0`.

**Pre-flight check already run:** all 13 rosters (10 + 2 tutorial + rare) have **0 crossings
at their authored layout**, so every puzzle is provably solvable. Difficulty curve is
4 beads/1 par (Bub) → 24 beads/14 par (Ollie).

## 2. Recommended stack

- **Vite + React 18 + TypeScript**, mobile-first at 390×844, installable **PWA**.
- **A standalone mobile web game** — any phone browser, installable to the homescreen,
  playable offline. The game is the product, so distribution does not drive the
  engineering. MiniPay runs the same build for free (its dApp browser is a web view with
  an injected provider), so we keep that path working without designing around it. Stores
  stay an option via Capacitor later, never a dependency.
- **Zustand + IndexedDB** (`idb-keyval`) for pond/progress — offline-first, no account needed.
- **viem + wagmi** on **Celo** (Alfajores for dev) behind a single `WalletPort`
  interface: WalletConnect for the general case, an injected provider when there is one,
  and MiniPay recognised opportunistically (`window.ethereum.isMiniPay`) rather than
  assumed. Nothing above that interface knows which wallet it got.
- **GoodDollar** for identity + UBI claim (verify SDK/package choice against live docs in step 5).
- **Cloudflare Worker + KV/D1** for the small amount of state that cannot live on the client:
  daily counters, Great Untangle aggregate, gift links, reward relay.
- **Vitest** for the engine; the browser pane for play-throughs.

```
src/
  engine/      geometry.ts  rng.ts  scramble.ts  nudge.ts   ← pure, tested, no React
  data/        creatures.ts themes.ts
  render/      CreatureSvg.tsx  sparkles.ts
  audio/       audio.ts  haptics.ts
  game/        store.ts  phases.ts  screens/{Splash,Puzzle,Pond}.tsx
  sheets/      Verify.tsx  Claim.tsx  Gift.tsx  GreatUntangle.tsx
  chain/       walletPort.ts  connectors.ts  gooddollar.ts
worker/        daily.ts  counters.ts  untangle.ts  rewards.ts
```

## 3. Phases

### Phase 0 — Repo ✅ done
Vite + TS + React scaffold, pnpm, vitest, biome, `vite-plugin-pwa`, Fredoka self-hosted
(woff2 subsets are already in the bundle), the `night`/`paper` theme tokens as CSS vars,
git init + first commit.

### Phase 1 — Engine port, typed and tested ✅ done
Port `snarl-lib.js` geometry into `src/engine/` as typed pure functions. Keep the seeded
`rng` byte-identical so a seed means the same tangle on client and server.
Tests, as invariants rather than snapshots:
- every roster is planar at `fit(nodes)` (the guarantee that puzzles are solvable);
- `scramble` lands inside each creature's `target` band for a sweep of seeds;
- `nudge` always returns a move that strictly reduces crossings when one exists;
- `crossings` ignores edges that share a bead (no false positives at joints).

Landed: 93 tests. Two things the port turned up —
- **Shelby could not hit its band.** 31 strings on 20 beads means random permutation
  overshoots: median 17 crossings against a `[12, 15]` band, max 26, in band only 32% of
  seeds. A knot 11 over the band against an unchanged par of 12 is a difficulty spike, so
  `scramble` now walks a missed attempt back down into the band with bead swaps (swaps keep
  every bead on a solved-layout position, so the solution stays reachable). Only the miss
  path runs it, so creatures that already landed in band keep exactly the knots they had.
  All 12 scrambled rosters now open at or under their band; Shelby is in band on 97% of
  seeds and never over it.
- **`fit` is a Jasmine keyword** (`fit` = focused `it`), so linters flag every call in a
  test file. Renamed to `solvedLayout`, which is also just a better name for what it
  returns: the layout the player is working towards.

### Phase 2 — The puzzle screen ✅ done
The whole loop: drag with pointer capture + grab offset, live crossing recount, phases
`play → inhale → unfurl → free → card`, Undo stack, Calm view, Nudge (3/day),
eyes `shut → one → open`, sparkle on each crossing resolved.
Build straight from the brand doc's motion table — plucks walk up C-major pentatonic so any
solve sounds musical, crossings get a **ring as well as warm colour** (never colour alone),
and `reduceMotion` swaps glides for instant moves. This phase ends with a playable,
installable game with no pond, no wallet, no server.

*Perf note:* `crossings` is O(E²) per frame (Ollie: 29 edges ≈ 400 pairs) — fine on a
phone, but recompute only the dragged bead's edges during the drag and do the full check
on drop.

Landed: splash with Bub untying itself, the drag loop on the incremental crossing path,
`play → inhale → unfurl → free → card`, Undo, Calm view, Nudge with its daily count and
out-of-nudges toast, the tutorial's drifting hand, and the name card with the under-par
shell. Played through the two tutorial knots and into World 1 in the browser. No pond, no
wallet, no server, and no component tests — the screens were verified by playing them.

### Phase 3 — Pond, progression, persistence ✅ done
Pond with per-creature idle animation (`swim`/`bob`/`walk`/`sit`), tap-to-react, the
10-slot layout; 3-knot tutorial; streak moon (7 phases, a miss dims one phase, streak
survives); Journal and Shop as stubs; persistence to IndexedDB; empty-pond state.

Landed: the progression rules are pure functions in `src/game/progress.ts` with their own
tests — day boundaries, nudge refill, and the moon's forgiveness rule (a fortnight away
costs the same one phase as a single missed day, which is what the copy promises). State
persists to IndexedDB rather than localStorage: the pond is the only record of the
player's collection. Played the whole tutorial through to the pond and reloaded to confirm
the pond comes back.

Two notes:
- The streak moon has nowhere to grow until the Daily Snarl exists, so it reads "New moon"
  and `recordDailySolved` is waiting for Phase 4 to call it.
- The empty-pond state cannot be reached by playing, since the tutorial always leaves three
  creatures. It is kept for a partial restore and for the reset that a settings screen will
  eventually want; verified by emptying the stored record by hand. (Phase 6 gave it a real
  route: someone whose first sight of snarl is a gift link lands on their own empty pond.)

### Phase 4 — Daily Snarl ✅ done
Date-derived seed (same tangle worldwide, verifiable server-side from the shared rng),
once-per-day lock, "freed by N today" counter from the Worker, already-solved and
offline edge states. Still no wallet.

Landed: the seed is FNV-1a over the day string, pinned by a test because it is a wire
format — change it and every recorded solve becomes unverifiable. A test also scrambles a
third of a year of dates to prove each one gives a solvable knot inside the rare band.
The pond carries the Daily Snarl card (silhouette until freed, then the creature and a
countdown), solving it grows the moon, and tapping a freed one opens the recap rather than
reopening the puzzle.

The Worker exists in `worker/` and is **not deployed**. It typechecks with the rest of the
project but has never run. The client treats the count as optional: with no `VITE_API_URL`
it never calls out, and the card simply says nothing rather than showing a zero that would
read as "nobody". Offline takes exactly that same path, which is why both are verified by
the same screen.

One thing to carry into Phase 5: the count has no identity behind it, so it is inflatable
by anyone with curl. It is company, not a score, and the capped G$ rewards must not be
paid from it.

### Phase 5 — The G$ layer ⚠️ mostly done, untested against a real wallet
Hard rule from the design: **puzzles never require a wallet.** The whole layer is additive.
1. `WalletPort` behind a feature flag — WalletConnect, injected, MiniPay auto-detected
   when present — plus the balance chip.
2. GoodDollar identity. **The mockup shows an in-app camera preview; in reality face
   verification is GoodDollar's own hosted flow, so this probably becomes a handoff and a
   return deep link.** Confirm against live GoodDollar/Celo docs before building the UI,
   and keep the drafted privacy copy ("only confirms you are unique").
3. Daily UBI claim — amount read on chain from UBIScheme, not the mocked `152.37`.
4. Daily Snarl reward (10 G$, capped) — paid by a **treasury relay in the Worker**, never
   the client. Sybil resistance comes free from requiring GoodDollar verification.
5. Claim card's three states, offline queueing (claims wait, puzzles don't).

What landed, and what the live docs changed:

- **The package is `@goodsdks/citizen-sdk` (1.2.7), viem-only.** The published docs give
  two different package names and subpath imports that do not exist; the real package has
  a single root export and no React or wagmi in it. So: viem, no wagmi, and the
  `WalletPort` is our own.
- **There is no testnet.** GoodDollar supports Celo, Fuse and XDC — no Alfajores. Staging
  is a different set of contracts on Celo mainnet, chosen with `env`, not a different
  chain. The plan's "Alfajores through Phase 5" was wrong.
- **G$ has 18 decimals on Celo and 2 on Fuse**, so an amount always travels with the chain
  it came from. There is a test for it.
- **Face verification is a handoff, as suspected.** `generateFVLink` asks the wallet to
  sign a message and returns a URL on `goodid.gooddollar.org`. The mockup's in-app camera
  does not exist and cannot: the camera belongs to GoodDollar's site. The sheet now says so.
- **The wallet layer is lazy.** It is a separate chunk, excluded from the service worker's
  precache, so a player who never opens a wallet installs 236 KB rather than 552 KB.
- **The Daily Snarl reward is not implemented.** Paying it needs a treasury key, a
  server-side identity check and a replay of the day's solution. The reasoning is written
  out at the end of `worker/daily.ts`; nothing in the UI promises a reward.
- **Untested against a real wallet.** There is no account here and nobody should be moving
  someone else's money to find out. Every state was driven through a demo adapter
  (`?wallet=demo`, development builds only) including the full leave-and-return trip
  through verification. The live adapter is written, typechecked and unexercised.

### Phase 6 — Social ⚠️ gifting done, the Great Untangle is a shell
Gift a Snarl (creature + optional tip, share link, recipient's first UBI on verifying) and
The Great Untangle (shared weekly knot, 62%-freed style aggregate, pool streaming over
7 days). Both need authoritative server state and a contract decision; scope them after
Phase 5 ships.

**Gifting works, without the tip.** The whole gift rides in the link's fragment, which is
never sent to a server, so there is nothing to sign up for at either end and nothing kept
anywhere. Opening a link cold lands on the pond the creature is joining; pasting one into
an already-open tab works too, since a fragment change reloads nothing.

The design's G$ tip is **not built, and cannot be as drawn**: a link has no address behind
it until someone opens it, so a tip needs either the recipient's wallet up front — which
is not how a link works — or an escrow contract to hold it until it is claimed. That is a
contract decision, not an afternoon's work, so there is no tip box rather than one that
quietly does nothing.

**The pool: decided.** The design's "Pool 120K G$ · streams to contributors over 7 days"
is not built, and the plan is that it never is in that form. Three reasons:

1. **It is a wage, and snarl has no revenue.** The UBI claim costs this game nothing — it
   is GoodDollar's money, going to people already entitled to it. A weekly pool is snarl's
   own money, paid from a treasury that nothing fills. The Shop does not exist. A burn with
   no engine is a deadline, not a feature.
2. **Per-pass payouts reward the wrong thing.** Anything proportional to passes pays the
   grindiest player rather than the most engaged one, and needs a server that can *prove*
   each pass to stop it being farmed. That is the expensive half of a cryptographic
   problem, bought in exchange for making the game worse.
3. **Split across a real crowd it is pocket change anyway.** The design's own numbers put a
   daily UBI claim at about 152 G$, so a 120K pool is roughly 790 claims' worth. Shared
   among a thousand contributors that is under a day's UBI each — not enough to change
   anyone's week, but easily enough to attract people who would farm it.

**What the week's knot pays instead is a creature.** Glint, a golden starfish, is tangled
up in the Great Untangle and comes out of nothing else. Free the week's knot once and Glint
is yours; a different one is in next week's. The prize is made of the game's own currency,
so there is no treasury, no contract, no payout verification and nothing worth sybilling
for — the only way to farm it is to play, which is the point.

That is also what unblocks the rest of the screen. A community total nobody can cash out
does not need cryptographic proof, only a server with sanity checks, so the shared
"62% freed" can ship as soon as the worker is deployed rather than waiting on a proof
system. Removing the money is what makes the social part buildable.

**If a pool ever does arrive** — from a sponsor or a GoodCollective rather than from
nowhere — the shape is already decided: an equal share for every verified identity that
freed the week's knot, regardless of how many passes they made, collected with the same
claim button as the daily UBI, rolling into next week's pool if left unclaimed. Equal
shares kill grinding at the design level instead of policing it, GoodDollar's identity root
is the sybil resistance, and a claim needs no streaming contract. Any figure shown would be
the live balance of a named address, never a marketing number.

**The Great Untangle is otherwise honest scaffolding.** The week's knot is real and shared:
an ISO week derives the seed the same way a date does, so everyone gets the same tangle
until Sunday, and passes at it are counted. The shared community total waits on the worker
being deployed; until then the screen speaks for the player in front of it. The endpoint
shapes are at the end of `worker/api.ts`.

### Phase 7 — Polish and release ⚠️ partly done
A11y pass (44pt targets, reduce-motion, non-colour signals, contrast in both themes),
the mobile browser matrix — iOS Safari and Chrome Android pointer-capture behaviour,
WebAudio's user-gesture unlock, and no `navigator.vibrate` on iOS, so haptics must be
decorative — perf on a mid Android, the four store frames the brand doc already storyboards, PWA
install prompt, launch.


Landed: contrast is now computed rather than eyeballed, and it found a real problem —
the brand doc's paper palette put the crossing counter at 2.6:1 and a freed creature at
2.3:1 against cream, both failing. Paper's creature lightness moved 0.68 → 0.55 and its
warm accent 0.68 → 0.55, which clears 3:1 on every hue in the roster against both the page
and the pond's water. `test/theme.test.ts` checks every token pair and every creature in
both themes, so the palette cannot regress quietly.

Also landed: a visible focus ring; the crossing count announced as a live region, since the
board is a drawing a screen reader cannot usefully walk; a settings sheet behind a single
More chip, carrying the theme and sound switches the design's prototype only had as
developer props, with Journal and Shop as honest "not built yet" rows; and the app icons,
drawn by `scripts/make-icons.py` with everything inside the middle 60% so the maskable
version survives being cropped to a circle.

Not done: the four store frames, a real-device pass on iOS Safari and Android Chrome, and
perf on a mid Android. One honest gap to carry: beads are dragged, and dragging has no
keyboard path, so the puzzle itself cannot be played without a pointer. Every other
surface can.

## 4. Decisions worth making now

1. **Distribution** — settled: a standalone mobile web PWA that happens to run in
   MiniPay, not a MiniPay-shaped app. Revisit stores only once the game stands on its own.
2. **How much server** — recommend one small Worker from Phase 4; everything before that
   is pure client.
3. **Chain/testnet** — Alfajores through Phase 5, mainnet at launch.
4. **Real economics** — the 10 G$ reward, the 120K pool and the Golden Knot are placeholder
   numbers in the mockups; they need a treasury model before Phase 6.

## 5. First concrete step

Phase 0 + Phase 1 together: scaffold the repo and land the typed engine with its test
suite. That is self-contained, and it de-risks everything after it.

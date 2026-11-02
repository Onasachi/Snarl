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

### Phase 2 — The puzzle screen (3–4 days) ← first shippable thing
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

### Phase 3 — Pond, progression, persistence (2–3 days)
Pond with per-creature idle animation (`swim`/`bob`/`walk`/`sit`), tap-to-react, the
10-slot layout; 3-knot tutorial; streak moon (7 phases, a miss dims one phase, streak
survives); Journal and Shop as stubs; persistence to IndexedDB; empty-pond state.

### Phase 4 — Daily Snarl (1–2 days)
Date-derived seed (same tangle worldwide, verifiable server-side from the shared rng),
once-per-day lock, "freed by N today" counter from the Worker, already-solved and
offline edge states. Still no wallet.

### Phase 5 — The G$ layer (1–2 weeks, most unknowns)
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

### Phase 6 — Social (1–2 weeks, design first)
Gift a Snarl (creature + optional tip, share link, recipient's first UBI on verifying) and
The Great Untangle (shared weekly knot, 62%-freed style aggregate, pool streaming over
7 days). Both need authoritative server state and a contract decision; scope them after
Phase 5 ships.

### Phase 7 — Polish and release
A11y pass (44pt targets, reduce-motion, non-colour signals, contrast in both themes),
the mobile browser matrix — iOS Safari and Chrome Android pointer-capture behaviour,
WebAudio's user-gesture unlock, and no `navigator.vibrate` on iOS, so haptics must be
decorative — perf on a mid Android, the four store frames the brand doc already storyboards, PWA
install prompt, launch.

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

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { audio, buzz, HAPTIC, PluckLadder } from "~/audio";
import {
  crossings as allCrossings,
  type Creature,
  type Crossing,
  crossingsInvolving,
  crossingTouchesBead,
  nudge as findNudge,
  type Nudge,
  type Pt,
  scramble,
  solvedLayout,
} from "~/engine";
import { useReducedMotion } from "~/hooks/useReducedMotion";
import type { Sparkle } from "~/render/CreatureSvg";

/**
 * play   — the player is dragging beads.
 * inhale — solved; the board draws in and the counter reads 0.
 * unfurl — beads glide to the true shape and the colour floods in.
 * free   — the creature is itself, eyes open, name card on the way.
 */
export type PuzzlePhase = "play" | "inhale" | "unfurl" | "free";

/** Beads cannot be dragged into the very edge of the grid. */
const EDGE = 4;
/** How far one arrow key nudges a bead, and how far with shift held. */
const KEY_STEP = 2;
const KEY_STEP_FAST = 8;
const BOARD_PAD = 12;

const SPARKLE_MS = 750;
const NUDGE_MS = 4500;
const INHALE_MS = 420;
const UNFURL_MS = 1200;
const CARD_MS = 550;

const key = (c: Crossing) => `${c.i}_${c.j}`;
const copy = (pos: readonly Pt[]): Pt[] => pos.map((p) => [p[0], p[1]] as Pt);

export interface UsePuzzleOptions {
  creature: Creature;
  /** Same seed, same opening knot. */
  seed: number;
  nudgesLeft: number;
  onSpendNudge: () => void;
  onNoNudges: () => void;
  /** The drifting finger, for the very first knot only. */
  withHand?: boolean;
  onSpendGuide?: () => boolean;
  onSpendGlimpse?: () => boolean;
}

export function usePuzzle({
  creature,
  seed,
  nudgesLeft,
  onSpendNudge,
  onNoNudges,
  withHand = false,
  onSpendGuide,
  onSpendGlimpse,
}: UsePuzzleOptions) {
  const reduce = useReducedMotion();
  const home = useMemo(() => solvedLayout(creature.nodes, BOARD_PAD), [creature]);

  const [pos, setPos] = useState<Pt[]>(home);
  const [solution, setSolution] = useState<Pt[] | null>(null);
  const [initialCrossings, setInitialCrossings] = useState(0);
  const [assisted, setAssisted] = useState(false);
  const [glimpse, setGlimpse] = useState(false);
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [phase, setPhase] = useState<PuzzlePhase>("play");
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<Pt[][]>([]);
  const [drag, setDrag] = useState(-1);
  const [dropped, setDropped] = useState(-1);
  const [dropKey, setDropKey] = useState(0);
  const [calm, setCalm] = useState(false);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [card, setCard] = useState(false);
  const [hand, setHand] = useState<{ from: Pt; to: Pt } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const posRef = useRef<Pt[]>(home);
  const dragStart = useRef<Pt[]>([]);
  const grabOffset = useRef<Pt>([0, 0]);
  /** Crossings that cannot change while this one bead moves. */
  const fixed = useRef<Crossing[]>([]);
  const prevKeys = useRef<Set<string>>(new Set());
  const ladder = useRef(new PluckLadder());
  /** The bead the keyboard is working on, so one visit counts as one move. */
  const keyboardBead = useRef(-1);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const commit = useCallback((next: Pt[]) => {
    posRef.current = next;
    setPos(next);
  }, []);

  // Opening the puzzle: a fresh knot, everything else back to zero.
  useEffect(() => {
    const tangled = scramble(creature, seed, BOARD_PAD) ?? copy(home);
    const cr = allCrossings(tangled, creature.edges);

    cancelAnimationFrame(raf.current);
    clearTimers();
    prevKeys.current = new Set(cr.map(key));
    ladder.current.reset();
    keyboardBead.current = -1;
    posRef.current = tangled;

    setPos(tangled);
    setSolution(null);
    setInitialCrossings(cr.length);
    setAssisted(false);
    setGlimpse(false);
    setCrossings(cr);
    setPhase("play");
    setMoves(0);
    setHistory([]);
    setDrag(-1);
    setDropped(-1);
    setCalm(false);
    setNudge(null);
    setSparkles([]);
    setCard(false);

    if (withHand) {
      const hint = findNudge(tangled, creature.edges);
      setHand({ from: tangled[hint.i]!, to: hint.to });
    } else {
      setHand(null);
    }

    return () => {
      cancelAnimationFrame(raf.current);
      clearTimers();
    };
  }, [creature, seed, home, withHand, clearTimers]);

  /** Tweens the whole board. Reduce motion jumps straight to the end. */
  const animate = useCallback(
    (from: readonly Pt[], to: readonly Pt[], duration: number, done?: () => void) => {
      cancelAnimationFrame(raf.current);
      if (reduceRef.current || duration <= 0) {
        commit(copy(to));
        done?.();
        return;
      }
      const t0 = performance.now();
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = ease(t);
        commit(
          from.map((p, i) => [p[0] + (to[i]![0] - p[0]) * e, p[1] + (to[i]![1] - p[1]) * e] as Pt),
        );
        if (t < 1) raf.current = requestAnimationFrame(step);
        else done?.();
      };
      raf.current = requestAnimationFrame(step);
    },
    [commit],
  );

  const solve = useCallback(() => {
    // Unfurl animates pos into the creature's illustration. Keep the player's actual
    // crossing-free drawing before that animation changes it.
    setSolution(copy(posRef.current));
    setPhase("inhale");
    later(
      () => {
        audio.chord();
        setPhase("unfurl");
        animate(posRef.current, home, UNFURL_MS, () => {
          audio.creature(creature.sound);
          buzz(HAPTIC.free);
          setPhase("free");
          later(() => {
            audio.chime();
            setCard(true);
          }, CARD_MS);
        });
      },
      reduce ? 0 : INHALE_MS,
    );
  }, [animate, creature, home, later, reduce]);

  /** Pointer position in grid units, kept off the very edge. */
  const toGrid = useCallback((e: ReactPointerEvent): Pt => {
    const el = svgRef.current;
    if (!el) return [50, 50];
    const r = el.getBoundingClientRect();
    return [
      Math.max(EDGE, Math.min(100 - EDGE, ((e.clientX - r.left) / r.width) * 100)),
      Math.max(EDGE, Math.min(100 - EDGE, ((e.clientY - r.top) / r.height) * 100)),
    ];
  }, []);

  const onBeadDown = useCallback(
    (bead: number, e: ReactPointerEvent<SVGCircleElement>) => {
      if (phase !== "play") return;
      e.preventDefault();
      audio.init();
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture is a nicety; dragging still works without it.
      }

      const current = posRef.current;
      dragStart.current = copy(current);
      const p = toGrid(e);
      grabOffset.current = [current[bead]![0] - p[0], current[bead]![1] - p[1]];
      // Everything not attached to this bead is frozen for the duration of the drag.
      fixed.current = allCrossings(current, creature.edges).filter(
        (c) => !crossingTouchesBead(c, creature.edges, bead),
      );

      audio.tick();
      buzz(HAPTIC.tap);
      keyboardBead.current = -1;
      setDrag(bead);
      setNudge(null);
      setHand(null);
    },
    [creature, phase, toGrid],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const bead = drag;
      if (bead < 0) return;

      const p = toGrid(e);
      const next = copy(posRef.current);
      next[bead] = [
        Math.max(EDGE, Math.min(100 - EDGE, p[0] + grabOffset.current[0])),
        Math.max(EDGE, Math.min(100 - EDGE, p[1] + grabOffset.current[1])),
      ];

      // Only this bead's strings can have changed, so only they are recounted.
      const cr = fixed.current.concat(crossingsInvolving(bead, next, creature.edges));
      const keys = new Set(cr.map(key));
      const gone = [...prevKeys.current].filter((k) => !keys.has(k));
      const born = [...keys].filter((k) => !prevKeys.current.has(k));

      if (gone.length) {
        audio.pluck(ladder.current.next());
        buzz(HAPTIC.resolve);
        // Sparkle where the crossings were, before they vanished.
        const where = fixed.current
          .concat(crossingsInvolving(bead, posRef.current, creature.edges))
          .filter((c) => gone.includes(key(c)))
          .slice(0, 3)
          .map((c) => ({ id: `${key(c)}-${performance.now()}`, x: c.x, y: c.y }));
        if (where.length) {
          setSparkles((s) => s.concat(where));
          for (const s of where) {
            later(() => setSparkles((list) => list.filter((q) => q.id !== s.id)), SPARKLE_MS);
          }
        }
      }
      if (born.length) audio.muted();

      prevKeys.current = keys;
      commit(next);
      setCrossings(cr);
    },
    [commit, creature, drag, later, toGrid],
  );

  /**
   * Beads can also be moved with the arrow keys. Dragging is the one thing in this game
   * that a pointer is required for, and leaving it there would put the whole puzzle out
   * of reach of anyone who does not use one.
   *
   * A visit to a bead counts as one move however many keys are pressed, which is what a
   * drag costs: par has to mean the same thing either way.
   */
  const moveBeadBy = useCallback(
    (bead: number, dx: number, dy: number) => {
      if (phase !== "play") return;

      const current = posRef.current;
      const from = current[bead]!;
      const next = copy(current);
      next[bead] = [
        Math.max(EDGE, Math.min(100 - EDGE, from[0] + dx)),
        Math.max(EDGE, Math.min(100 - EDGE, from[1] + dy)),
      ];

      if (keyboardBead.current !== bead) {
        keyboardBead.current = bead;
        setHistory((h) => h.concat([copy(current)]));
        setMoves((m) => m + 1);
        audio.init();
        audio.tick();
      }

      const cr = allCrossings(next, creature.edges);
      const keys = new Set(cr.map(key));
      if ([...prevKeys.current].some((k) => !keys.has(k))) {
        audio.pluck(ladder.current.next());
        buzz(HAPTIC.resolve);
      }
      prevKeys.current = keys;

      commit(next);
      setCrossings(cr);
      setNudge(null);
      setHand(null);
      setDropped(bead);
      setDropKey((k) => k + 1);
      if (cr.length === 0) solve();
    },
    [commit, creature, phase, solve],
  );

  /** Leaving a bead ends its move, so coming back to it costs another one. */
  const onBeadFocus = useCallback((bead: number) => {
    if (keyboardBead.current !== bead) keyboardBead.current = -1;
  }, []);

  const onBeadKeyDown = useCallback(
    (bead: number, e: ReactKeyboardEvent<SVGCircleElement>) => {
      const step = e.shiftKey ? KEY_STEP_FAST : KEY_STEP;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = deltas[e.key];
      if (!delta) return;
      e.preventDefault();
      moveBeadBy(bead, delta[0], delta[1]);
    },
    [moveBeadBy],
  );

  const onPointerUp = useCallback(() => {
    const bead = drag;
    if (bead < 0) return;

    const from = dragStart.current[bead]!;
    const to = posRef.current[bead]!;
    const moved = Math.hypot(from[0] - to[0], from[1] - to[1]) > 0.8;

    audio.drop();
    setDrag(-1);
    setDropped(bead);
    setDropKey((k) => k + 1);
    if (moved) {
      setMoves((m) => m + 1);
      setHistory((h) => h.concat([dragStart.current]));
    }

    // Full recount on drop: the incremental path drives the live counter, but the win
    // condition is always checked against the whole board.
    const cr = allCrossings(posRef.current, creature.edges);
    prevKeys.current = new Set(cr.map(key));
    setCrossings(cr);
    if (cr.length === 0) solve();
  }, [creature, drag, solve]);

  const undo = useCallback(() => {
    if (phase !== "play") return;
    setHistory((h) => {
      const last = h.at(-1);
      if (!last) return h;
      const cr = allCrossings(last, creature.edges);
      prevKeys.current = new Set(cr.map(key));
      commit(copy(last));
      setCrossings(cr);
      setMoves((m) => Math.max(0, m - 1));
      setNudge(null);
      audio.tick();
      return h.slice(0, -1);
    });
  }, [commit, creature, phase]);

  const toggleCalm = useCallback(() => setCalm((c) => !c), []);

  const requestNudge = useCallback(() => {
    if (phase !== "play") return;
    if (nudgesLeft <= 0) {
      onNoNudges();
      return;
    }
    audio.init();
    audio.chime();
    setNudge(findNudge(posRef.current, creature.edges));
    setAssisted(true);
    onSpendNudge();
    later(() => setNudge(null), NUDGE_MS);
  }, [creature, later, nudgesLeft, onNoNudges, onSpendNudge, phase]);

  const useGuide = useCallback(() => {
    if (phase !== "play") return;
    const hint = findNudge(posRef.current, creature.edges);
    if (hint.gain <= 0 || !onSpendGuide?.()) return;
    const next = copy(posRef.current);
    setHistory((h) => h.concat([copy(next)]));
    next[hint.i] = [...hint.to];
    const cr = allCrossings(next, creature.edges);
    commit(next);
    setCrossings(cr);
    prevKeys.current = new Set(cr.map(key));
    setMoves((m) => m + 1);
    setAssisted(true);
    setNudge(null);
    setHand(null);
    keyboardBead.current = -1;
    audio.chime();
    if (cr.length === 0) solve();
  }, [phase, creature, onSpendGuide, commit, solve]);
  const useGlimpse = useCallback(() => {
    if (phase !== "play" || glimpse || !onSpendGlimpse?.()) return;
    setAssisted(true);
    setGlimpse(true);
    later(() => setGlimpse(false), 4000);
  }, [phase, glimpse, onSpendGlimpse, later]);

  const free = phase === "unfurl" || phase === "free";
  const shown = free || phase === "inhale" ? 0 : crossings.length;

  return {
    creature,
    pos,
    solution,
    initialCrossings,
    assisted,
    glimpse,
    home,
    useGuide,
    useGlimpse,
    phase,
    free,
    /** What the counter reads. Zero the moment the puzzle is solved, before the Unfurl. */
    crossingCount: shown,
    crossings: free ? [] : crossings,
    moves,
    calm,
    nudge,
    sparkles,
    card,
    drag,
    dropped,
    dropKey,
    hand,
    eyes: free ? ("open" as const) : crossings.length <= 2 ? ("one" as const) : ("shut" as const),
    slowShiver: crossings.length <= 2,
    canUndo: history.length > 0,
    underPar: moves <= creature.par,
    svgRef,
    onBeadDown,
    onBeadKeyDown,
    onBeadFocus,
    onPointerMove,
    onPointerUp,
    undo,
    toggleCalm,
    requestNudge,
  };
}

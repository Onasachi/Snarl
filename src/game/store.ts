import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { audio } from "~/audio";
import type { ThemeId } from "~/data";
import type { Creature } from "~/engine";
import {
  dayKey,
  grownMoon,
  MOON_PHASES,
  MOON_REWARD_NUDGES,
  moonAfterGap,
  NUDGES_PER_DAY,
  nudgesForDay,
  TUTORIAL_KNOTS,
} from "./progress";
import type { GameRun } from "./results";
import { emptySupplies, type Supply, type SupplyCounts } from "./supplies";
import { nextWeeklySolves } from "./weekly";

/** One creature in the pond, in the order it was freed. */
export interface FreedCreature {
  /** Creature id. The same creature can be freed again when World 1 wraps. */
  id: string;
  /** Stable React key and pond slot identity. */
  key: string;
  at: number;
  moves: number;
  underPar: boolean;
  /** Arrived as a gift rather than being freed here. */
  gifted?: boolean;
  /** Who sent it, when they said. */
  from?: string;
}

/**
 * A gift link this device put G$ behind. Kept because the link is the only key to that
 * money: if it is never opened, this is what lets the sender take it back.
 */
export interface SentTip {
  /** The link's one-time key. Whoever has this can open the gift. */
  key: string;
  creature: string;
  /** Decimal string: IndexedDB holds JSON, and this is a bigint by the time it is spent. */
  amount: string;
  at: number;
}

/** A drawing as the player left it, in the integers the contracts read. */
export interface Drawing {
  xs: string[];
  ys: string[];
}

interface GameState {
  gameRuns: Record<string, GameRun>;
  saveGameRun: (run: GameRun) => void;
  adventureLevel: number;
  adventureResults: Record<
    number,
    { moves: number; stars: number; crossings: number; points: number; assisted: boolean }
  >;
  completeAdventure: (level: number, result: GameState["adventureResults"][number]) => void;
  supplyPurchased: Record<string, SupplyCounts>;
  supplySpent: Record<string, SupplyCounts>;
  syncSupplies: (wallet: string, counts: SupplyCounts) => void;
  spendSupply: (wallet: string, item: Supply) => boolean;
  /** False until IndexedDB has been read. The pond must not flash empty before then. */
  hydrated: boolean;
  pondPalette: number;
  unlockedPalettes: number[];
  completedTrails: string[];
  setPondPalette: (palette: number) => void;
  completeTrail: (key: string, palette: number) => void;
  freed: FreedCreature[];
  /** How far through the three-knot tutorial. 3 means done. */
  tutorialStep: number;
  /** Next World 1 creature, after the one the tutorial already gave away. */
  playIndex: number;
  nudges: number;
  nudgeDay: string | null;
  /**
   * Nudges earned from the moon or bought by putting G$ in a week's pot. These do not
   * expire at midnight; the free three return whether or not these are spent.
   */
  extraNudges: number;
  moon: number;
  lastDailyDay: string | null;
  /** The last solve whose subsequent gap has already dimmed the moon. */
  moonDimmedFor: string | null;
  /** Passes contributed to this week's Great Untangle, and the week they belong to. */
  weeklySolves: number;
  weeklyWeek: string | null;
  /** The week whose knot has already given up its creature. One per week. */
  weeklyEarnedWeek: string | null;
  /**
   * The board as the player left it when they freed the week's knot, kept so it can be
   * sent to the contract later. Decimal strings: IndexedDB holds JSON, and these are
   * bigints by the time they reach the chain.
   */
  weeklyProof: { week: string; xs: string[]; ys: string[] } | null;
  /** False until the first look at the pond has been explained. Shown once, ever. */
  introSeen: boolean;
  /** Gift links with money behind them, newest first, until they are opened or taken back. */
  sentTips: SentTip[];
  /**
   * The last drawing this player made of each creature, by creature id.
   *
   * Kept so that putting a creature on the board sends the shape they actually drew. The
   * contract would take any untangled drawing, including the creature's true one straight
   * out of the repository — so this is not about passing the check. It is about the record
   * being theirs.
   */
  proofs: Record<string, Drawing>;
  theme: ThemeId;
  sound: boolean;
  /** When today's Daily Snarl was freed, for "you freed it at 08:14". */
  lastDailyAt: number | null;

  openDay: (today?: string) => void;
  recordFreed: (creature: Creature, moves: number, drawing?: Drawing) => void;
  /** A creature someone else freed and sent on. No shell: it was not this player's solve. */
  receiveGift: (creature: Creature, from?: string) => void;
  completeTutorialStep: () => void;
  advancePlay: (nextIndex?: number) => void;
  spendNudge: (wallet?: string) => void;
  /** Credited after G$ has actually reached the pool, never before. */
  addExtraNudges: (count: number) => void;
  /** Returns bonus nudges earned, or null when this day was already recorded. */
  recordDailySolved: (today?: string) => number | null;
  /**
   * Adds a pass at the week's knot, and the first pass of a week puts its creature in the
   * pond. Further passes still count; they just do not hand out a second one.
   */
  recordWeeklySolve: (
    week: string,
    creature: Creature,
    proof: { xs: string[]; ys: string[] },
  ) => void;
  markIntroSeen: () => void;
  recordSentTip: (tip: SentTip) => void;
  /** Once a gift is opened or taken back, there is nothing left to remember. */
  forgetSentTip: (key: string) => void;
  setTheme: (theme: ThemeId) => void;
  setSound: (sound: boolean) => void;
  clearProgress: () => Promise<void>;
}

const KEY = "snarl.progress.v1";

/**
 * IndexedDB rather than localStorage: the pond is the player's collection, it is the only
 * record of it, and localStorage is both small and the first thing a browser throws away.
 */
const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export const useGame = create<GameState>()(
  persist(
    (setState, getState) => ({
      hydrated: false,
      gameRuns: {},
      saveGameRun: (run) =>
        setState((s) => ({ gameRuns: { ...s.gameRuns, [run.id]: s.gameRuns[run.id] ?? run } })),
      adventureLevel: 1,
      adventureResults: {},
      completeAdventure: (level, result) =>
        setState((s) => {
          if (level > s.adventureLevel || level < 1) return {};
          const previous = s.adventureResults[level];
          return {
            adventureLevel: Math.max(s.adventureLevel, level + 1),
            adventureResults: {
              ...s.adventureResults,
              [level]: previous && previous.stars > result.stars ? previous : result,
            },
          };
        }),
      supplyPurchased: {},
      supplySpent: {},
      syncSupplies: (wallet, counts) =>
        setState((s) => ({
          supplyPurchased: { ...s.supplyPurchased, [wallet.toLowerCase()]: counts },
        })),
      spendSupply: (wallet, item) => {
        const key = wallet.toLowerCase();
        const s = getState();
        const used = s.supplySpent[key] ?? emptySupplies();
        if ((s.supplyPurchased[key]?.[item] ?? 0) <= used[item]) return false;
        setState({ supplySpent: { ...s.supplySpent, [key]: { ...used, [item]: used[item] + 1 } } });
        return true;
      },
      pondPalette: 0,
      unlockedPalettes: [0],
      completedTrails: [],
      setPondPalette: (palette) =>
        setState((s) => (s.unlockedPalettes.includes(palette) ? { pondPalette: palette } : {})),
      completeTrail: (key, palette) =>
        setState((s) => ({
          completedTrails: [...new Set([...s.completedTrails, key])],
          unlockedPalettes: [...new Set([...s.unlockedPalettes, palette])],
          pondPalette: palette,
        })),
      freed: [],
      tutorialStep: 0,
      playIndex: 1,
      nudges: NUDGES_PER_DAY,
      nudgeDay: null,
      extraNudges: 0,
      moon: 0,
      lastDailyDay: null,
      moonDimmedFor: null,
      lastDailyAt: null,
      weeklySolves: 0,
      weeklyWeek: null,
      weeklyEarnedWeek: null,
      weeklyProof: null,
      introSeen: false,
      sentTips: [],
      proofs: {},
      theme: "night",
      sound: true,

      /** Run once on load, and whenever the app comes back to a new day. */
      openDay: (today = dayKey()) =>
        setState((s) => {
          const moon =
            s.moonDimmedFor === s.lastDailyDay
              ? s.moon
              : moonAfterGap(s.moon, s.lastDailyDay, today);
          return {
            nudges: nudgesForDay(s.nudgeDay, today, s.nudges),
            nudgeDay: today,
            moon,
            moonDimmedFor: moon < s.moon ? s.lastDailyDay : s.moonDimmedFor,
          };
        }),

      recordFreed: (creature, moves, drawing) =>
        setState((s) => ({
          ...(drawing ? { proofs: { ...s.proofs, [creature.id]: drawing } } : {}),
          freed: s.freed.concat({
            id: creature.id,
            key: `${creature.id}-${s.freed.length}-${Date.now()}`,
            at: Date.now(),
            moves,
            underPar: moves <= creature.par,
          }),
        })),

      receiveGift: (creature, from) =>
        setState((s) => ({
          freed: s.freed.concat({
            id: creature.id,
            key: `${creature.id}-gift-${s.freed.length}-${Date.now()}`,
            at: Date.now(),
            moves: 0,
            underPar: false,
            gifted: true,
            ...(from ? { from } : {}),
          }),
        })),

      completeTutorialStep: () =>
        setState((s) => ({ tutorialStep: Math.min(TUTORIAL_KNOTS.length, s.tutorialStep + 1) })),

      advancePlay: (nextIndex) => setState((s) => ({ playIndex: nextIndex ?? s.playIndex + 1 })),

      // The day's free ones first. Something bought should still be there tomorrow.
      spendNudge: (wallet) => {
        const s = getState();
        if (s.nudges > 0) setState({ nudges: s.nudges - 1 });
        else if (s.extraNudges > 0) setState({ extraNudges: s.extraNudges - 1 });
        else if (wallet) s.spendSupply(wallet, "hint");
      },

      addExtraNudges: (count) => setState((s) => ({ extraNudges: s.extraNudges + count })),

      recordDailySolved: (today = dayKey()) => {
        const { lastDailyDay } = getState();
        if (lastDailyDay !== null && lastDailyDay >= today) return null;
        getState().openDay(today);
        let earned = 0;
        setState((s) => {
          const moon = grownMoon(s.moon);
          earned = moon >= MOON_PHASES ? MOON_REWARD_NUDGES : 0;
          return {
            moon,
            lastDailyDay: today,
            lastDailyAt: Date.now(),
            // The payoff for seven days of turning up. Kept with the bought ones, which
            // is where nudges that outlast a day live.
            extraNudges: s.extraNudges + earned,
          };
        });
        return earned;
      },

      recordWeeklySolve: (week, creature, proof) =>
        setState((s) => {
          const earned = s.weeklyEarnedWeek === week;
          return {
            weeklyProof: { week, xs: proof.xs, ys: proof.ys },
            weeklyWeek: week,
            weeklySolves: nextWeeklySolves(s.weeklyWeek, s.weeklySolves, week),
            weeklyEarnedWeek: week,
            freed: earned
              ? s.freed
              : s.freed.concat({
                  id: creature.id,
                  key: `${creature.id}-${week}`,
                  at: Date.now(),
                  moves: 0,
                  underPar: false,
                }),
          };
        }),

      markIntroSeen: () => setState({ introSeen: true }),

      recordSentTip: (tip) => setState((s) => ({ sentTips: [tip, ...s.sentTips] })),

      forgetSentTip: (key) =>
        setState((s) => ({ sentTips: s.sentTips.filter((tip) => tip.key !== key) })),

      setTheme: (theme) => setState({ theme }),

      setSound: (sound) => {
        audio.enabled = sound;
        setState({ sound });
      },

      clearProgress: async () => {
        await del(KEY);
        setState({
          adventureLevel: 1,
          adventureResults: {},
          gameRuns: {},
          pondPalette: 0,
          unlockedPalettes: [0],
          completedTrails: [],
          freed: [],
          tutorialStep: 0,
          playIndex: 1,
          nudges: NUDGES_PER_DAY,
          nudgeDay: null,
          extraNudges: 0,
          moon: 0,
          lastDailyDay: null,
          moonDimmedFor: null,
          lastDailyAt: null,
          weeklySolves: 0,
          weeklyWeek: null,
          weeklyEarnedWeek: null,
          weeklyProof: null,
          proofs: {},
          introSeen: false,
          // `sentTips` survives on purpose. It is the only key to money somebody put up
          // and nobody has taken yet, and that is not progress to be cleared.
        });
        getState().openDay();
      },
    }),
    {
      name: KEY,
      storage: createJSONStorage(() => idbStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => {
        state?.openDay();
        // The audio kit is a module singleton, so it has to be told what was stored.
        audio.enabled = state?.sound ?? true;
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Creature } from "~/engine";
import {
  dayKey,
  grownMoon,
  moonAfterGap,
  NUDGES_PER_DAY,
  nudgesForDay,
  TUTORIAL_KNOTS,
} from "./progress";

/** One creature in the pond, in the order it was freed. */
export interface FreedCreature {
  /** Creature id. The same creature can be freed again when World 1 wraps. */
  id: string;
  /** Stable React key and pond slot identity. */
  key: string;
  at: number;
  moves: number;
  underPar: boolean;
}

interface GameState {
  /** False until IndexedDB has been read. The pond must not flash empty before then. */
  hydrated: boolean;
  freed: FreedCreature[];
  /** How far through the three-knot tutorial. 3 means done. */
  tutorialStep: number;
  /** Next World 1 creature, after the one the tutorial already gave away. */
  playIndex: number;
  nudges: number;
  nudgeDay: string | null;
  moon: number;
  lastDailyDay: string | null;

  openDay: (today?: string) => void;
  recordFreed: (creature: Creature, moves: number) => void;
  completeTutorialStep: () => void;
  advancePlay: () => void;
  spendNudge: () => void;
  recordDailySolved: (today?: string) => void;
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
      freed: [],
      tutorialStep: 0,
      playIndex: 1,
      nudges: NUDGES_PER_DAY,
      nudgeDay: null,
      moon: 0,
      lastDailyDay: null,

      /** Run once on load, and whenever the app comes back to a new day. */
      openDay: (today = dayKey()) =>
        setState((s) => ({
          nudges: nudgesForDay(s.nudgeDay, today, s.nudges),
          nudgeDay: today,
          moon: moonAfterGap(s.moon, s.lastDailyDay, today),
        })),

      recordFreed: (creature, moves) =>
        setState((s) => ({
          freed: s.freed.concat({
            id: creature.id,
            key: `${creature.id}-${s.freed.length}-${Date.now()}`,
            at: Date.now(),
            moves,
            underPar: moves <= creature.par,
          }),
        })),

      completeTutorialStep: () =>
        setState((s) => ({ tutorialStep: Math.min(TUTORIAL_KNOTS.length, s.tutorialStep + 1) })),

      advancePlay: () => setState((s) => ({ playIndex: s.playIndex + 1 })),

      spendNudge: () => setState((s) => ({ nudges: Math.max(0, s.nudges - 1) })),

      recordDailySolved: (today = dayKey()) =>
        setState((s) => ({ moon: grownMoon(s.moon), lastDailyDay: today })),

      clearProgress: async () => {
        await del(KEY);
        setState({
          freed: [],
          tutorialStep: 0,
          playIndex: 1,
          nudges: NUDGES_PER_DAY,
          nudgeDay: null,
          moon: 0,
          lastDailyDay: null,
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
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

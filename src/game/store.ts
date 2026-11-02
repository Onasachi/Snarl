import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { audio } from "~/audio";
import type { ThemeId } from "~/data";
import type { Creature } from "~/engine";
import {
  dayKey,
  grownMoon,
  moonAfterGap,
  NUDGES_PER_DAY,
  nudgesForDay,
  TUTORIAL_KNOTS,
} from "./progress";
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
  /** Passes contributed to this week's Great Untangle, and the week they belong to. */
  weeklySolves: number;
  weeklyWeek: string | null;
  /** The week whose knot has already given up its creature. One per week. */
  weeklyEarnedWeek: string | null;
  theme: ThemeId;
  sound: boolean;
  /** When today's Daily Snarl was freed, for "you freed it at 08:14". */
  lastDailyAt: number | null;

  openDay: (today?: string) => void;
  recordFreed: (creature: Creature, moves: number) => void;
  /** A creature someone else freed and sent on. No shell: it was not this player's solve. */
  receiveGift: (creature: Creature, from?: string) => void;
  completeTutorialStep: () => void;
  advancePlay: () => void;
  spendNudge: () => void;
  recordDailySolved: (today?: string) => void;
  /**
   * Adds a pass at the week's knot, and the first pass of a week puts its creature in the
   * pond. Further passes still count; they just do not hand out a second one.
   */
  recordWeeklySolve: (week: string, creature: Creature) => void;
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
      freed: [],
      tutorialStep: 0,
      playIndex: 1,
      nudges: NUDGES_PER_DAY,
      nudgeDay: null,
      moon: 0,
      lastDailyDay: null,
      lastDailyAt: null,
      weeklySolves: 0,
      weeklyWeek: null,
      weeklyEarnedWeek: null,
      theme: "night",
      sound: true,

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

      advancePlay: () => setState((s) => ({ playIndex: s.playIndex + 1 })),

      spendNudge: () => setState((s) => ({ nudges: Math.max(0, s.nudges - 1) })),

      recordDailySolved: (today = dayKey()) =>
        setState((s) => ({
          moon: grownMoon(s.moon),
          lastDailyDay: today,
          lastDailyAt: Date.now(),
        })),

      recordWeeklySolve: (week, creature) =>
        setState((s) => {
          const earned = s.weeklyEarnedWeek === week;
          return {
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

      setTheme: (theme) => setState({ theme }),

      setSound: (sound) => {
        audio.enabled = sound;
        setState({ sound });
      },

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
          lastDailyAt: null,
          weeklySolves: 0,
          weeklyWeek: null,
          weeklyEarnedWeek: null,
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

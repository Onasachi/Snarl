import type { Creature } from "~/engine";

/**
 * The Great Untangle's creature, authored here rather than generated from the design
 * reference: it is the one piece of the roster that is ours.
 *
 * A starfish, because the week's knot wants a shape that reads at a glance from across a
 * pond. Gold, at a hue well clear of the warm accent that belongs to crossings.
 *
 * Laid out as a pentagon with five arms, which is planar by construction: the body is a
 * cycle and every arm hangs off it without reaching across. Verified like every other
 * roster entry by test/engine.test.ts, at three different paddings.
 */
export const WEEKLY: Creature = {
  id: "glint",
  name: "Glint",
  shape: "Starfish",
  hue: 95,
  chroma: 0.15,
  lore: "Only shows up for the big knots.",
  sound: "hum",
  move: "sit",
  idle: "Turns very slowly",
  tap: "Curls one arm",
  target: [10, 13],
  par: 10,
  nodes: [
    [50, 34],
    [65, 45],
    [59, 63],
    [41, 63],
    [35, 45],
    [50, 20],
    [78, 41],
    [68, 74],
    [32, 74],
    [22, 41],
    [50, 6],
    [92, 36],
    [76, 86],
    [24, 86],
    [8, 36],
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 0],
    [0, 5],
    [5, 10],
    [1, 6],
    [6, 11],
    [2, 7],
    [7, 12],
    [3, 8],
    [8, 13],
    [4, 9],
    [9, 14],
  ],
  eye: 0,
};

import { createElement, type KeyboardEvent } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TUTORIAL } from "~/data";
import { crossings, solvedLayout } from "~/engine";
import { usePuzzle } from "~/game/usePuzzle";

vi.mock("~/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));
vi.mock("~/audio", () => ({
  audio: new Proxy({}, { get: () => () => {} }),
  buzz: () => {},
  HAPTIC: {},
  PluckLadder: class {
    reset() {}
    next() {
      return 0;
    }
  },
}));
let puzzle: ReturnType<typeof usePuzzle>;
const spendGuide = vi.fn(() => true);
const spendGlimpse = vi.fn(() => true);
function Harness() {
  puzzle = usePuzzle({
    creature: TUTORIAL[0]!,
    seed: 0,
    nudgesLeft: 3,
    onSpendNudge: () => {},
    onNoNudges: () => {},
    onSpendGuide: spendGuide,
    onSpendGlimpse: spendGlimpse,
  });
  return null;
}
describe("a player's actual solution", () => {
  let renderer: ReactTestRenderer;
  beforeEach(async () => {
    spendGuide.mockReset().mockReturnValue(true);
    spendGlimpse.mockReset().mockReturnValue(true);
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout });
    vi.stubGlobal("requestAnimationFrame", vi.fn());
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    await act(async () => {
      renderer = create(createElement(Harness));
    });
  });
  afterEach(async () => {
    await act(async () => renderer.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("retains the solved drawing even after the celebration changes the visible shape", async () => {
    expect(puzzle.initialCrossings).toBe(1);
    for (let i = 0; i < 6; i++)
      await act(async () => {
        puzzle.onBeadKeyDown(0, {
          key: "ArrowDown",
          shiftKey: true,
          preventDefault: () => {},
        } as KeyboardEvent<SVGCircleElement>);
      });
    expect(puzzle.solution).not.toBeNull();
    const drawing = puzzle.solution!;
    expect(crossings(drawing, TUTORIAL[0]!.edges)).toHaveLength(0);
    expect(drawing).not.toEqual(solvedLayout(TUTORIAL[0]!.nodes, 12));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(puzzle.card).toBe(true);
    expect(puzzle.pos).toEqual(solvedLayout(TUTORIAL[0]!.nodes, 12));
    expect(puzzle.solution).toEqual(drawing);
  });
  it("consumes one helping hand only when a bead can be moved, and marks the solve assisted", async () => {
    const before = puzzle.pos;
    spendGuide.mockReturnValueOnce(false);
    await act(async () => puzzle.useGuide());
    expect(puzzle.pos).toEqual(before);
    expect(puzzle.assisted).toBe(false);
    await act(async () => puzzle.useGuide());
    expect(puzzle.crossingCount).toBeLessThan(1);
    expect(puzzle.moves).toBe(1);
    expect(puzzle.assisted).toBe(true);
    expect(puzzle.solution).not.toBeNull();
    await act(async () => puzzle.useGuide());
    expect(spendGuide).toHaveBeenCalledTimes(2);
  });
  it("shows a temporary firefly guide without moving beads or consuming another while active", async () => {
    const before = puzzle.pos;
    await act(async () => puzzle.useGlimpse());
    expect(puzzle.glimpse).toBe(true);
    expect(puzzle.pos).toEqual(before);
    expect(puzzle.moves).toBe(0);
    expect(puzzle.assisted).toBe(true);
    await act(async () => puzzle.useGlimpse());
    expect(spendGlimpse).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(puzzle.glimpse).toBe(false);
  });
});

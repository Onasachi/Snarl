import { describe, expect, it } from "vitest";
import { PluckLadder } from "~/audio";

describe("PluckLadder", () => {
  // Every pluck has to land on a note that exists, however long the solve runs. The
  // ladder climbs by one or two and drops back an octave at the top, so a hundred
  // resolved crossings keep rising without ever running off the scale.
  it("stays on the scale over a long solve", () => {
    const ladder = new PluckLadder();
    for (let i = 0; i < 2000; i++) {
      const step = ladder.next();
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(10);
      expect(Number.isInteger(step)).toBe(true);
    }
  });

  it("climbs rather than wandering", () => {
    const ladder = new PluckLadder();
    const first = ladder.next();
    expect(first).toBeGreaterThan(2);
  });

  it("starts each puzzle low again", () => {
    const ladder = new PluckLadder();
    for (let i = 0; i < 50; i++) ladder.next();
    ladder.reset();
    expect(ladder.next()).toBeLessThanOrEqual(4);
  });
});

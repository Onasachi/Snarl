import { describe, expect, it } from "vitest";
import { nextHomeAction } from "~/game/home";

describe("the next home adventure", () => {
  it("keeps unfinished learning ahead of daily puzzles, including gifted collections", () => {
    expect(
      nextHomeAction({ tutorialStep: 1, residents: 5, worldCount: 3, dailySolved: false }),
    ).toBe("learn");
  });
  it("gives a player with their first three friends another rescue", () => {
    expect(
      nextHomeAction({ tutorialStep: 3, residents: 3, worldCount: 1, dailySolved: false }),
    ).toBe("rescue");
  });
  it("offers the daily puzzle once the player has grown their collection", () => {
    expect(
      nextHomeAction({ tutorialStep: 3, residents: 4, worldCount: 2, dailySolved: false }),
    ).toBe("daily");
  });
  it("returns to exploration after the daily is done", () => {
    expect(
      nextHomeAction({ tutorialStep: 3, residents: 6, worldCount: 4, dailySolved: true }),
    ).toBe("rescue");
  });
  it("offers trails after both today's puzzle and the original collection are complete", () => {
    expect(
      nextHomeAction({ tutorialStep: 3, residents: 13, worldCount: 10, dailySolved: true }),
    ).toBe("trails");
    expect(
      nextHomeAction({ tutorialStep: 3, residents: 13, worldCount: 10, dailySolved: false }),
    ).toBe("daily");
  });
});

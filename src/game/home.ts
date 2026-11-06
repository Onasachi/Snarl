import { CREATURES } from "~/data";
import { TUTORIAL_KNOTS } from "./progress";

/** Learning and the first few rescues take priority over the daily habit. */
export function nextHomeAction({
  tutorialStep,
  residents,
  worldCount,
  dailySolved,
}: {
  tutorialStep: number;
  residents: number;
  worldCount: number;
  dailySolved: boolean;
}): "learn" | "rescue" | "daily" | "trails" {
  if (tutorialStep < TUTORIAL_KNOTS.length) return "learn";
  if (residents <= 3 && worldCount < CREATURES.length) return "rescue";
  if (!dailySolved) return "daily";
  return worldCount < CREATURES.length ? "rescue" : "trails";
}

import { useCallback, useState } from "react";
import { PhoneFrame } from "~/game/PhoneFrame";
import { creatureForPlay, playCaption, TUTORIAL_KNOTS } from "~/game/progress";
import { PondScreen } from "~/game/screens/PondScreen";
import { PuzzleScreen } from "~/game/screens/PuzzleScreen";
import { SplashScreen } from "~/game/screens/SplashScreen";
import { useGame } from "~/game/store";
import { Toast, useToast } from "~/game/Toast";

type Screen = "splash" | "puzzle" | "pond";

/** How long the creatures take to rise into the pond the first time. */
const INTRO_MS = 3500;

export function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [intro, setIntro] = useState(false);
  const toast = useToast();

  const hydrated = useGame((s) => s.hydrated);
  const tutorialStep = useGame((s) => s.tutorialStep);
  const playIndex = useGame((s) => s.playIndex);
  const nudges = useGame((s) => s.nudges);
  const recordFreed = useGame((s) => s.recordFreed);
  const completeTutorialStep = useGame((s) => s.completeTutorialStep);
  const advancePlay = useGame((s) => s.advancePlay);
  const spendNudge = useGame((s) => s.spendNudge);

  const inTutorial = tutorialStep < TUTORIAL_KNOTS.length;
  const creature = inTutorial ? TUTORIAL_KNOTS[tutorialStep]! : creatureForPlay(playIndex);
  const seed = inTutorial ? tutorialStep : playIndex;
  const lastTutorialKnot = tutorialStep === TUTORIAL_KNOTS.length - 1;

  const toPond = useCallback((withIntro: boolean) => {
    setIntro(withIntro);
    setScreen("pond");
    if (withIntro) window.setTimeout(() => setIntro(false), INTRO_MS);
  }, []);

  /** Begin leads to the tutorial for a new player, and straight to the pond for everyone else. */
  const begin = useCallback(() => {
    setScreen(tutorialStep < TUTORIAL_KNOTS.length ? "puzzle" : "pond");
  }, [tutorialStep]);

  const next = useCallback(
    (moves: number) => {
      recordFreed(creature, moves);
      if (inTutorial) {
        completeTutorialStep();
        if (lastTutorialKnot) toPond(true);
        return;
      }
      advancePlay();
      toPond(false);
    },
    [
      advancePlay,
      completeTutorialStep,
      creature,
      inTutorial,
      lastTutorialKnot,
      recordFreed,
      toPond,
    ],
  );

  const noNudges = useCallback(
    () => toast.show("Out of Nudges for today. Calm view still helps."),
    [toast],
  );

  return (
    <PhoneFrame>
      {screen === "splash" && <SplashScreen onBegin={begin} enabled={hydrated} />}

      {screen === "puzzle" && (
        <PuzzleScreen
          key={`${creature.id}-${seed}-${tutorialStep}`}
          creature={creature}
          seed={seed}
          caption={
            inTutorial
              ? `Tutorial · ${tutorialStep + 1} of ${TUTORIAL_KNOTS.length}`
              : playCaption(playIndex)
          }
          hint={
            tutorialStep === 0
              ? "Drag a bead until no strings cross."
              : lastTutorialKnot && inTutorial
                ? "Stuck? Nudge shows one bead to move."
                : ""
          }
          withHand={tutorialStep === 0}
          almostFree={tutorialStep > 0}
          showNudge={!inTutorial || lastTutorialKnot}
          highlightNudge={inTutorial && lastTutorialKnot}
          nudgesLeft={nudges}
          onSpendNudge={spendNudge}
          onNoNudges={noNudges}
          nextLabel={inTutorial && !lastTutorialKnot ? "Next knot" : "Release to the pond"}
          onNext={next}
        />
      )}

      {screen === "pond" && (
        <PondScreen onPlay={() => setScreen("puzzle")} intro={intro} onToast={toast.show} />
      )}

      <Toast message={toast.message} />
    </PhoneFrame>
  );
}

import { useCallback, useState } from "react";
import { CREATURES, TUTORIAL } from "~/data";
import { PhoneFrame } from "~/game/PhoneFrame";
import { PuzzleScreen } from "~/game/screens/PuzzleScreen";
import { SplashScreen } from "~/game/screens/SplashScreen";
import { Toast, useToast } from "~/game/Toast";

/** Two tutorial knots, then World 1 in order. The pond arrives in Phase 3. */
const ORDER = [...TUTORIAL, ...CREATURES];
const NUDGES_PER_DAY = 3;

export function App() {
  const [begun, setBegun] = useState(false);
  const [index, setIndex] = useState(0);
  const [nudges, setNudges] = useState(NUDGES_PER_DAY);
  const toast = useToast();

  const creature = ORDER[index % ORDER.length]!;
  const isTutorial = index < TUTORIAL.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % ORDER.length), []);
  const spendNudge = useCallback(() => setNudges((n) => Math.max(0, n - 1)), []);
  const noNudges = useCallback(
    () => toast.show("Out of Nudges for today. Calm view still helps."),
    [toast],
  );

  return (
    <PhoneFrame>
      {begun ? (
        <PuzzleScreen
          key={`${creature.id}-${index}`}
          creature={creature}
          seed={index}
          caption={
            isTutorial ? `Tutorial · ${index + 1} of ${TUTORIAL.length}` : `World 1 · ${index - 1}`
          }
          hint={
            index === 0
              ? "Drag a bead until no strings cross."
              : index === TUTORIAL.length && nudges === NUDGES_PER_DAY
                ? "Stuck? Nudge shows one bead to move."
                : ""
          }
          withHand={index === 0}
          almostFree={index > 0}
          showNudge={!isTutorial}
          highlightNudge={index === TUTORIAL.length && nudges === NUDGES_PER_DAY}
          nudgesLeft={nudges}
          onSpendNudge={spendNudge}
          onNoNudges={noNudges}
          nextLabel="Next knot"
          onNext={next}
        />
      ) : (
        <SplashScreen onBegin={() => setBegun(true)} />
      )}
      <Toast message={toast.message} />
    </PhoneFrame>
  );
}

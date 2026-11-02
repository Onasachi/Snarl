import { useCallback, useEffect, useMemo, useState } from "react";
import { DAILY_CREATURE, dailySeed, isDailySolved } from "~/game/daily";
import { PhoneFrame } from "~/game/PhoneFrame";
import { creatureForPlay, dayKey, playCaption, TUTORIAL_KNOTS } from "~/game/progress";
import { DailySolved } from "~/game/screens/DailySolved";
import { PondScreen } from "~/game/screens/PondScreen";
import { PuzzleScreen } from "~/game/screens/PuzzleScreen";
import { SplashScreen } from "~/game/screens/SplashScreen";
import { useGame } from "~/game/store";
import { Toast, useToast } from "~/game/Toast";
import { freedByLabel, useDailyCount } from "~/game/useDailyCount";
import { VerifySheet } from "~/game/VerifySheet";
import { claimCardState, formatAmount } from "~/wallet";
import { returningFromVerification, useWallet } from "~/wallet/useWallet";

type Screen = "splash" | "puzzle" | "pond";
/** Ordinary progress through World 1, or today's rare knot. */
type Mode = "progress" | "daily";

/** How long the creatures take to rise into the pond the first time. */
const INTRO_MS = 3500;

/**
 * Read once when the module loads, not inside a state initializer: the check clears the
 * flag as it reads it, and StrictMode runs initializers twice, which would consume the
 * flag on the first pass and see nothing on the second.
 */
const RETURNED_FROM_VERIFICATION = returningFromVerification();

export function App() {
  // Coming back from the face check lands on the pond, where they left off, rather than
  // on the splash screen as if they had just arrived.
  const [screen, setScreen] = useState<Screen>(RETURNED_FROM_VERIFICATION ? "pond" : "splash");
  const [mode, setMode] = useState<Mode>("progress");
  const [intro, setIntro] = useState(false);
  const [dailyRecap, setDailyRecap] = useState(false);
  const [verifySheet, setVerifySheet] = useState(false);
  const toast = useToast();

  const hydrated = useGame((s) => s.hydrated);
  const tutorialStep = useGame((s) => s.tutorialStep);
  const playIndex = useGame((s) => s.playIndex);
  const nudges = useGame((s) => s.nudges);
  const lastDailyDay = useGame((s) => s.lastDailyDay);
  const lastDailyAt = useGame((s) => s.lastDailyAt);
  const recordFreed = useGame((s) => s.recordFreed);
  const completeTutorialStep = useGame((s) => s.completeTutorialStep);
  const advancePlay = useGame((s) => s.advancePlay);
  const spendNudge = useGame((s) => s.spendNudge);
  const recordDailySolved = useGame((s) => s.recordDailySolved);

  const today = useMemo(() => dayKey(), []);
  const { freed: freedToday, report } = useDailyCount(today);
  const dailySolved = isDailySolved(lastDailyDay, today);

  const inTutorial = tutorialStep < TUTORIAL_KNOTS.length;
  const isDaily = mode === "daily";
  const creature = isDaily
    ? DAILY_CREATURE
    : inTutorial
      ? TUTORIAL_KNOTS[tutorialStep]!
      : creatureForPlay(playIndex);
  const seed = isDaily ? dailySeed(today) : inTutorial ? tutorialStep : playIndex;
  const lastTutorialKnot = tutorialStep === TUTORIAL_KNOTS.length - 1;

  const toPond = useCallback((withIntro: boolean) => {
    setIntro(withIntro);
    setMode("progress");
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

      if (isDaily) {
        recordDailySolved(today);
        void report(moves);
        toPond(false);
        window.setTimeout(() => toast.show("Your moon grew a phase."), 900);
        return;
      }

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
      isDaily,
      lastTutorialKnot,
      recordDailySolved,
      recordFreed,
      report,
      toast,
      toPond,
      today,
    ],
  );

  /** One rare knot a day: once it is freed, the card shows the solve rather than reopening it. */
  const openDaily = useCallback(() => {
    if (dailySolved) {
      setDailyRecap(true);
      return;
    }
    setMode("daily");
    setScreen("puzzle");
  }, [dailySolved]);

  const noNudges = useCallback(
    () => toast.show("Out of Nudges for today. Calm view still helps."),
    [toast],
  );

  // The G$ layer. Nothing above this line knows it exists, and the game is complete
  // without it: no puzzle, pond or streak asks whether a wallet is connected.
  const wallet = useWallet();
  const claimState = claimCardState(wallet.account, wallet.status);

  const onClaimAction = useCallback(async () => {
    if (claimState === "disconnected") {
      await wallet.connect();
      return;
    }
    if (claimState === "unverified") {
      setVerifySheet(true);
      return;
    }
    if (claimState === "ready") {
      const amount = await wallet.claim();
      if (amount !== null && wallet.status) {
        toast.show(`${formatAmount(amount, wallet.status.decimals)} claimed. See you tomorrow.`);
      }
    }
  }, [claimState, toast, wallet]);

  useEffect(() => {
    if (!wallet.error) return;
    toast.show(
      wallet.error === "no-wallet"
        ? "No wallet found on this device. Puzzles never need one."
        : wallet.error === "rejected"
          ? "Left as it was."
          : "That did not go through. Nothing moved.",
    );
  }, [wallet.error, toast]);

  const dailyChips = ["Rare · Daily Snarl", freedByLabel(freedToday)].filter(
    (chip): chip is string => chip !== null,
  );

  return (
    <PhoneFrame>
      {screen === "splash" && <SplashScreen onBegin={begin} enabled={hydrated} />}

      {screen === "puzzle" && (
        <PuzzleScreen
          key={`${creature.id}-${seed}-${tutorialStep}-${mode}`}
          creature={creature}
          seed={seed}
          caption={
            isDaily
              ? "Daily Snarl · rare"
              : inTutorial
                ? `Tutorial · ${tutorialStep + 1} of ${TUTORIAL_KNOTS.length}`
                : playCaption(playIndex)
          }
          hint={
            isDaily
              ? ""
              : tutorialStep === 0
                ? "Drag a bead until no strings cross."
                : lastTutorialKnot && inTutorial
                  ? "Stuck? Nudge shows one bead to move."
                  : ""
          }
          chips={isDaily ? dailyChips : undefined}
          withHand={!isDaily && tutorialStep === 0}
          almostFree={isDaily || tutorialStep > 0}
          showNudge={isDaily || !inTutorial || lastTutorialKnot}
          highlightNudge={!isDaily && inTutorial && lastTutorialKnot}
          nudgesLeft={nudges}
          onSpendNudge={spendNudge}
          onNoNudges={noNudges}
          nextLabel={
            !isDaily && inTutorial && !lastTutorialKnot ? "Next knot" : "Release to the pond"
          }
          onNext={next}
          toast={<Toast message={toast.message} />}
        />
      )}

      {screen === "pond" && (
        <PondScreen
          onPlay={() => setScreen("puzzle")}
          intro={intro}
          onToast={toast.show}
          dailySolved={dailySolved}
          dailySubtitle={dailySolved ? null : freedByLabel(freedToday)}
          onOpenDaily={openDaily}
          claim={{
            state: claimState,
            status: wallet.status,
            hasWallet: wallet.available !== false,
            busy: wallet.busy,
            onAction: () => void onClaimAction(),
          }}
          toast={<Toast message={toast.message} />}
        />
      )}

      {verifySheet && (
        <VerifySheet
          busy={wallet.busy}
          onStart={() => void wallet.verify()}
          onClose={() => setVerifySheet(false)}
        />
      )}

      {dailyRecap && (
        <DailySolved at={lastDailyAt} others={freedToday} onBack={() => setDailyRecap(false)} />
      )}
    </PhoneFrame>
  );
}

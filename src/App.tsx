import { useCallback, useEffect, useMemo, useState } from "react";
import { DAILY_CREATURE, dailySeed, isDailySolved } from "~/game/daily";
import { giftedCreature, giftFromHash } from "~/game/gift";
import { PhoneFrame } from "~/game/PhoneFrame";
import { creatureForPlay, dayKey, playCaption, TUTORIAL_KNOTS } from "~/game/progress";
import { DailySolved } from "~/game/screens/DailySolved";
import { GiftReceived } from "~/game/screens/GiftReceived";
import { GiftScreen } from "~/game/screens/GiftScreen";
import { GreatUntangle } from "~/game/screens/GreatUntangle";
import { PondScreen } from "~/game/screens/PondScreen";
import { PuzzleScreen } from "~/game/screens/PuzzleScreen";
import { SplashScreen } from "~/game/screens/SplashScreen";
import { useGame } from "~/game/store";
import { Toast, useToast } from "~/game/Toast";
import { freedByLabel, useDailyCount } from "~/game/useDailyCount";
import { VerifySheet } from "~/game/VerifySheet";
import { WEEKLY_CREATURE, weekKey, weeklySeed } from "~/game/weekly";
import { claimCardState, formatAmount } from "~/wallet";
import { returningFromVerification, useWallet } from "~/wallet/useWallet";

type Screen = "splash" | "puzzle" | "pond" | "gift" | "untangle";
/** Ordinary progress through World 1, today's rare knot, or a pass at the week's. */
type Mode = "progress" | "daily" | "weekly";

/** How long the creatures take to rise into the pond the first time. */
const INTRO_MS = 3500;

/**
 * Read once when the module loads, not inside a state initializer: the check clears the
 * flag as it reads it, and StrictMode runs initializers twice, which would consume the
 * flag on the first pass and see nothing on the second.
 */
const RETURNED_FROM_VERIFICATION = returningFromVerification();

/**
 * A gift lives in the fragment. Take it and clear the fragment straight away, so a reload
 * cannot hand out the same creature twice.
 */
const takeGiftFromUrl = () => {
  const gift = giftFromHash(window.location.hash);
  if (gift) window.history.replaceState({}, "", window.location.pathname + window.location.search);
  return gift;
};

/** Read once, before React runs, for a link opened cold. */
const ARRIVED_WITH_GIFT = takeGiftFromUrl();

export function App() {
  // Coming back from the face check lands on the pond, where they left off, rather than
  // on the splash screen as if they had just arrived. A gift link lands there too: the
  // creature is going into that pond, so that is what should be behind it. For someone
  // whose first ever sight of snarl is a gift, that pond is empty and says so.
  const [screen, setScreen] = useState<Screen>(
    RETURNED_FROM_VERIFICATION || ARRIVED_WITH_GIFT ? "pond" : "splash",
  );
  const [mode, setMode] = useState<Mode>("progress");
  const [intro, setIntro] = useState(false);
  const [dailyRecap, setDailyRecap] = useState(false);
  const [verifySheet, setVerifySheet] = useState(false);
  const [gift, setGift] = useState(ARRIVED_WITH_GIFT);
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
  const recordWeeklySolve = useGame((s) => s.recordWeeklySolve);
  const receiveGift = useGame((s) => s.receiveGift);

  const week = useMemo(() => weekKey(), []);

  const today = useMemo(() => dayKey(), []);
  const { freed: freedToday, report } = useDailyCount(today);
  const dailySolved = isDailySolved(lastDailyDay, today);

  const inTutorial = tutorialStep < TUTORIAL_KNOTS.length;
  const isDaily = mode === "daily";
  const isWeekly = mode === "weekly";
  const creature = isDaily
    ? DAILY_CREATURE
    : isWeekly
      ? WEEKLY_CREATURE
      : inTutorial
        ? TUTORIAL_KNOTS[tutorialStep]!
        : creatureForPlay(playIndex);
  const seed = isDaily
    ? dailySeed(today)
    : isWeekly
      ? weeklySeed(week)
      : inTutorial
        ? tutorialStep
        : playIndex;
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
      if (mode !== "weekly") recordFreed(creature, moves);

      if (isDaily) {
        recordDailySolved(today);
        void report(moves);
        toPond(false);
        window.setTimeout(() => toast.show("Your moon grew a phase."), 900);
        return;
      }

      // A pass at the week's knot counts towards the Great Untangle. It does not join the
      // pond: everyone is working the same creature, and ten copies of it is not a pond.
      if (isWeekly) {
        recordWeeklySolve(week);
        setMode("progress");
        setScreen("untangle");
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
      isWeekly,
      lastTutorialKnot,
      recordDailySolved,
      mode,
      recordFreed,
      recordWeeklySolve,
      report,
      toast,
      toPond,
      today,
      week,
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

  // A gift link pasted into a tab that already has snarl open only changes the fragment,
  // which does not reload anything. Without this the link would appear to do nothing.
  useEffect(() => {
    const onHashChange = () => {
      const arrived = takeGiftFromUrl();
      if (arrived) setGift(arrived);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
            isWeekly
              ? "The Great Untangle"
              : isDaily
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
          onGift={() => setScreen("gift")}
          onUntangle={() => setScreen("untangle")}
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

      {screen === "gift" && <GiftScreen onBack={() => setScreen("pond")} onToast={toast.show} />}

      {screen === "untangle" && (
        <GreatUntangle
          week={week}
          onBack={() => setScreen("pond")}
          onAddSolve={() => {
            setMode("weekly");
            setScreen("puzzle");
          }}
        />
      )}

      {dailyRecap && (
        <DailySolved at={lastDailyAt} others={freedToday} onBack={() => setDailyRecap(false)} />
      )}

      {gift && (
        <GiftReceived
          gift={gift}
          onAccept={() => {
            const creature = giftedCreature(gift);
            if (creature) receiveGift(creature, gift.from);
            setGift(null);
            setScreen("pond");
            toast.show(creature ? `${creature.name} joined your pond.` : "Added to your pond.");
          }}
          onDecline={() => setGift(null)}
        />
      )}
    </PhoneFrame>
  );
}

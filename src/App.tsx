import { useCallback, useEffect, useMemo, useState } from "react";
import { chainIdOf } from "~/chain/roster";
import { CREATURES, creatureById } from "~/data";
import type { Pt } from "~/engine";
import { solvedLayout, toChainPositions } from "~/engine";
import { nextExplorationIndex } from "~/game/collection";
import { DAILY_CREATURE, dailySeed, isDailySolved } from "~/game/daily";
import { giftedCreature, giftFromHash } from "~/game/gift";
import { MoreSheet } from "~/game/MoreSheet";
import { PhoneFrame } from "~/game/PhoneFrame";
import { creatureForPlay, nudgesForPot, playCaption, TUTORIAL_KNOTS } from "~/game/progress";
import { AdminScreen } from "~/game/screens/AdminScreen";
import { BoardScreen } from "~/game/screens/BoardScreen";
import { DailySolved } from "~/game/screens/DailySolved";
import { GiftReceived } from "~/game/screens/GiftReceived";
import { GiftScreen } from "~/game/screens/GiftScreen";
import { GreatUntangle } from "~/game/screens/GreatUntangle";
import { JournalScreen } from "~/game/screens/JournalScreen";
import { PondScreen } from "~/game/screens/PondScreen";
import { ProfileScreen } from "~/game/screens/ProfileScreen";
import { PuzzleScreen } from "~/game/screens/PuzzleScreen";
import { SplashScreen } from "~/game/screens/SplashScreen";
import { TrailsScreen } from "~/game/screens/TrailsScreen";
import { useGame } from "~/game/store";
import { Toast, useToast } from "~/game/Toast";
import { freedByLabel, useDailyCount } from "~/game/useDailyCount";
import { VerifySheet } from "~/game/VerifySheet";
import { WalletSheet } from "~/game/WalletSheet";
import { WEEKLY_CREATURE, weekId, weeklySeed } from "~/game/weekly";
import { useCalendar } from "~/hooks/useCalendar";
import { type Trail, trailSeed } from "~/market/types";
import { claimCardState, formatAmount, type TipStatus } from "~/wallet";
import { returningFromVerification, useWallet } from "~/wallet/useWallet";

type Screen =
  | "splash"
  | "puzzle"
  | "pond"
  | "gift"
  | "untangle"
  | "board"
  | "weeks"
  | "you"
  | "journal"
  | "trails";
/** Ordinary progress through World 1, today's rare knot, or a pass at the week's. */
type Mode = "progress" | "daily" | "weekly" | "trail";

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

/**
 * `?weeks` asks for the screen that keeps the pool running. Read once, at module scope,
 * like the gift: a flag the app decides on at startup rather than re-derives.
 */
const ASKED_FOR_ADMIN = new URLSearchParams(window.location.search).has("weeks");

/** `0x5ab1…0001`: enough to recognise an address by, short enough for a header. */
const shortAddress = (address: string): string => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function App() {
  // Coming back from the face check lands on the pond, where they left off, rather than
  // on the splash screen as if they had just arrived. A gift link lands there too: the
  // creature is going into that pond, so that is what should be behind it. For someone
  // whose first ever sight of snarl is a gift, that pond is empty and says so.
  const [screen, setScreen] = useState<Screen>(
    new URLSearchParams(window.location.search).has("trail")
      ? "trails"
      : RETURNED_FROM_VERIFICATION || ARRIVED_WITH_GIFT
        ? "pond"
        : "splash",
  );
  const [trailRun, setTrailRun] = useState<{ trail: Trail; step: number; preview: boolean } | null>(
    null,
  );
  const completeTrail = useGame((s) => s.completeTrail);
  const [mode, setMode] = useState<Mode>("progress");
  const [intro, setIntro] = useState(false);
  const [dailyRecap, setDailyRecap] = useState(false);
  const [verifySheet, setVerifySheet] = useState(false);
  const [moreSheet, setMoreSheet] = useState(false);
  const [gift, setGift] = useState(ARRIVED_WITH_GIFT);
  /**
   * The weeks screen is reached by asking for it. That hides it from players rather than
   * protecting it — the contract's `onlyOwner` is the only thing that protects anything,
   * and the screen says so to a wallet that is not the owner.
   */
  const [wantsAdmin] = useState(ASKED_FOR_ADMIN);
  /** Wallets to choose between, when there is a choice. Empty the rest of the time. */
  const [wallets, setWallets] = useState<readonly { id: string; name: string }[]>([]);
  const toast = useToast();

  const hydrated = useGame((s) => s.hydrated);
  const tutorialStep = useGame((s) => s.tutorialStep);
  const storedPlayIndex = useGame((s) => s.playIndex);
  const freed = useGame((s) => s.freed);
  const playIndex = useMemo(
    () => nextExplorationIndex(storedPlayIndex, freed),
    [storedPlayIndex, freed],
  );
  const nudges = useGame((s) => s.nudges);
  const lastDailyDay = useGame((s) => s.lastDailyDay);
  const lastDailyAt = useGame((s) => s.lastDailyAt);
  const recordFreed = useGame((s) => s.recordFreed);
  const proofs = useGame((s) => s.proofs);
  const openDay = useGame((s) => s.openDay);
  const introSeen = useGame((s) => s.introSeen);
  const markIntroSeen = useGame((s) => s.markIntroSeen);
  const extraNudges = useGame((s) => s.extraNudges);
  const addExtraNudges = useGame((s) => s.addExtraNudges);
  const completeTutorialStep = useGame((s) => s.completeTutorialStep);
  const advancePlay = useGame((s) => s.advancePlay);
  const spendNudge = useGame((s) => s.spendNudge);
  const recordDailySolved = useGame((s) => s.recordDailySolved);
  const recordWeeklySolve = useGame((s) => s.recordWeeklySolve);
  const weeklyEarnedWeek = useGame((s) => s.weeklyEarnedWeek);
  const receiveGift = useGame((s) => s.receiveGift);

  const { today, week } = useCalendar(screen === "puzzle");
  const { freed: freedToday, report } = useDailyCount(today);
  const dailySolved = isDailySolved(lastDailyDay, today);

  useEffect(() => {
    if (hydrated) openDay(today);
  }, [hydrated, openDay, today]);

  useEffect(() => {
    if (!dailySolved) setDailyRecap(false);
  }, [dailySolved]);

  const inTutorial = mode === "progress" && tutorialStep < TUTORIAL_KNOTS.length;
  const isDaily = mode === "daily";
  const isWeekly = mode === "weekly";
  const creature =
    mode === "trail" && trailRun
      ? CREATURES[trailRun.trail.creatures[trailRun.step]!]!
      : isDaily
        ? DAILY_CREATURE
        : isWeekly
          ? WEEKLY_CREATURE
          : inTutorial
            ? TUTORIAL_KNOTS[tutorialStep]!
            : creatureForPlay(playIndex);
  const seed =
    mode === "trail" && trailRun
      ? trailSeed(trailRun.trail, trailRun.step)
      : isDaily
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
    (moves: number, pos: readonly Pt[]) => {
      if (mode === "trail" && trailRun) {
        const { xs, ys } = toChainPositions(pos);
        recordFreed(creature, moves, { xs: xs.map(String), ys: ys.map(String) });
        if (!trailRun.preview && trailRun.step < 2) {
          setTrailRun({ ...trailRun, step: trailRun.step + 1 });
        } else {
          if (!trailRun.preview && trailRun.trail.id >= 0 && trailRun.trail.owned) {
            completeTrail(
              `${trailRun.trail.creator}:${trailRun.trail.id}:${trailRun.trail.seed}`,
              trailRun.trail.palette,
            );
            toast.show("Trail complete. Your new water is waiting in the pond.");
          } else
            toast.show(
              trailRun.preview
                ? "A little taste. Keep the trail to play all three."
                : "Playtest complete. Your draft is waiting in Make a trail.",
            );
          setMode("progress");
          setScreen(
            !trailRun.preview && trailRun.trail.id >= 0 && trailRun.trail.owned ? "pond" : "trails",
          );
          setTrailRun(null);
        }
        return;
      }
      if (isDaily) {
        const earned = recordDailySolved(today);
        if (earned === null) {
          toPond(false);
          return;
        }
        const { xs, ys } = toChainPositions(pos);
        recordFreed(creature, moves, { xs: xs.map(String), ys: ys.map(String) });
        void report(moves);
        toPond(false);
        window.setTimeout(
          () =>
            toast.show(
              earned > 0
                ? `Daily bonus! ${earned} extra hints are yours.`
                : "Daily puzzle complete. One step closer to 7 extra hints.",
            ),
          900,
        );
        return;
      }

      if (mode !== "weekly") {
        const { xs, ys } = toChainPositions(pos);
        recordFreed(creature, moves, { xs: xs.map(String), ys: ys.map(String) });
      }

      // A pass at the week's knot counts towards the Great Untangle. It does not join the
      // pond: everyone is working the same creature, and ten copies of it is not a pond.
      if (isWeekly) {
        const first = weeklyEarnedWeek !== week;
        // The board as they left it, in the integers the contract reads, so entering the
        // pool later sends their own drawing rather than one the game supplied.
        const { xs, ys } = toChainPositions(pos);
        recordWeeklySolve(week, WEEKLY_CREATURE, {
          xs: xs.map(String),
          ys: ys.map(String),
        });
        setMode("progress");
        setScreen("untangle");
        if (first) {
          window.setTimeout(
            () => toast.show(`${WEEKLY_CREATURE.name} joined your pond. Back on Monday.`),
            600,
          );
        }
        return;
      }

      if (inTutorial) {
        completeTutorialStep();
        if (lastTutorialKnot) toPond(true);
        return;
      }

      advancePlay(playIndex + 1);
    },
    [
      advancePlay,
      playIndex,
      trailRun,
      completeTrail,
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
      weeklyEarnedWeek,
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

  // The G$ layer. Nothing above this line knows it exists, and the game is complete
  // without it: no puzzle, pond or streak asks whether a wallet is connected.
  const wallet = useWallet();
  const claimState = claimCardState(wallet.account, wallet.checkingStatus ? null : wallet.status);

  const requestVerification = useCallback(async () => {
    const current = await wallet.refresh();
    if (current && !current.verified) setVerifySheet(true);
  }, [wallet.refresh]);

  useEffect(() => {
    if (!wallet.account || wallet.status?.verified) setVerifySheet(false);
  }, [wallet.account, wallet.status?.verified]);

  const noNudges = useCallback(
    () =>
      toast.show(
        // Only mention the pot where it exists and could actually be used. Everywhere
        // else the sentence is the one it always was.
        wallet.week && wallet.account
          ? "Out of hints today. Calm view still helps, or back the week for more."
          : "Out of hints for today. Calm view still helps.",
      ),
    [toast, wallet.account, wallet.week],
  );

  /**
   * Connecting asks which wallet first, but only when there is more than one. Picking
   * for somebody is how Connect ended up opening a wallet for another chain entirely.
   */
  const startConnect = useCallback(async () => {
    const found = await wallet.listWallets();
    if (found.length > 1) {
      setWallets(found);
      return;
    }
    await wallet.connect();
  }, [wallet]);

  const onClaimAction = useCallback(async () => {
    if (claimState === "checking") {
      await wallet.refresh();
      return;
    }
    if (claimState === "disconnected") {
      await startConnect();
      return;
    }
    if (claimState === "unverified" || claimState === "expired") {
      await requestVerification();
      return;
    }
    if (claimState === "ready") {
      const amount = await wallet.claim();
      if (amount !== null && wallet.status) {
        toast.show(`${formatAmount(amount, wallet.status.decimals)} claimed. See you tomorrow.`);
      }
    }
  }, [claimState, requestVerification, startConnect, toast, wallet]);

  useEffect(() => {
    if (!wallet.error) return;
    if (wallet.error === "wallet-changed")
      setScreen((current) => (current === "you" ? "pond" : current));
    toast.show(
      wallet.error === "wallet-changed"
        ? "Your wallet account or network changed. Connect again to refresh it."
        : wallet.error === "no-wallet"
          ? wallet.emailOffered
            ? "No wallet found. Choose Log in with email to get started."
            : "No wallet found. Open snarl in a browser with an EVM wallet."
          : wallet.error === "wrong-chain"
            ? "Your wallet needs to be on Celo for that."
            : wallet.error === "rejected"
              ? "Left as it was."
              : "Could not confirm that request. Refresh your wallet status before retrying.",
    );
  }, [wallet.emailOffered, wallet.error, toast]);

  // The Great Untangle's pool, when there is one. Read on opening the screen, never at
  // startup: a player who never goes there never touches a chain.
  const weekNumber = useMemo(() => weekId(week), [week]);
  const weeklyProof = useGame((s) => s.weeklyProof);
  const weeklyEarned = weeklyEarnedWeek === week;

  useEffect(() => {
    if (screen === "untangle" && wallet.account) void wallet.loadWeek(weekNumber);
  }, [screen, wallet.account, wallet.loadWeek, weekNumber]);

  const enterPool = useCallback(async () => {
    // Their own drawing if it is still here; the creature's true shape if it is not. The
    // contract accepts any untangled drawing, so this is about whose it is, not whether
    // it passes.
    const drawing =
      weeklyProof?.week === week
        ? { xs: weeklyProof.xs.map(BigInt), ys: weeklyProof.ys.map(BigInt) }
        : toChainPositions(solvedLayout(WEEKLY_CREATURE.nodes, 12));

    if (await wallet.enterWeek(weekNumber, drawing.xs, drawing.ys)) {
      toast.show("You are in this week's pool.");
    }
  }, [toast, wallet, week, weekNumber, weeklyProof]);

  /**
   * Puts G$ into this week's pool, and credits the nudges it earns — but only after the
   * money has actually arrived. The nudges are local; the G$ is not, and the order
   * matters more than it looks.
   */
  const backPool = useCallback(
    async (g$: number) => {
      const decimals = wallet.status?.decimals ?? 18;
      const amount = BigInt(Math.round(g$ * 100)) * 10n ** BigInt(decimals - 2);
      const earned = nudgesForPot(g$);
      if (earned === 0 || amount <= 0n) return;

      if (await wallet.backWeek(weekNumber, amount)) {
        addExtraNudges(earned);
        toast.show(
          `In the pot. ${earned} ${earned === 1 ? "hint" : "hints"} for you, the rest for whoever frees it.`,
        );
      }
    },
    [addExtraNudges, toast, wallet, weekNumber],
  );

  const collectPool = useCallback(async () => {
    const amount = await wallet.collectWeek(weekNumber);
    if (amount !== null && wallet.week) {
      toast.show(`${formatAmount(amount, wallet.week.decimals)} collected.`);
    }
  }, [toast, wallet, weekNumber]);

  // G$ behind the gift link that was just opened, if there is any. Read without
  // connecting anything: the amount is worth seeing before deciding to get a wallet.
  const [giftTip, setGiftTip] = useState<TipStatus | null>(null);
  useEffect(() => {
    if (!gift?.key) {
      setGiftTip(null);
      return;
    }
    let live = true;
    void wallet.loadTip(gift.key).then((found) => {
      if (live) setGiftTip(found);
    });
    return () => {
      live = false;
    };
  }, [gift?.key, wallet.loadTip]);

  const takeGiftTip = useCallback(async () => {
    if (!gift?.key) return;
    const amount = await wallet.openTip(gift.key);
    if (amount === null) return;
    setGiftTip(await wallet.loadTip(gift.key));
    toast.show(
      `${formatAmount(amount, wallet.status?.decimals ?? 18)} is yours. ${
        giftedCreature(gift)?.name ?? "The creature"
      } too, if you take it.`,
    );
  }, [gift, toast, wallet]);

  // The board reads without a wallet, so it is loaded when the screen opens and not
  // before: a player who never looks at it never asks a chain for anything.
  useEffect(() => {
    if (screen === "board") void wallet.loadBoard();
  }, [screen, wallet.loadBoard]);

  useEffect(() => {
    if (screen === "weeks") void wallet.loadAdmin();
  }, [screen, wallet.loadAdmin]);

  useEffect(() => {
    if (screen === "you") void wallet.loadBoard();
  }, [screen, wallet.loadBoard]);

  const putOnBoard = useCallback(
    async (slug: string) => {
      const id = chainIdOf(slug);
      const drawing = proofs[slug];
      if (id === undefined || !drawing) return;

      if (await wallet.proveUntangle(id, drawing.xs.map(BigInt), drawing.ys.map(BigInt))) {
        toast.show(`${creatureById(slug)?.name ?? "It"} is on the board.`);
      }
    },
    [proofs, toast, wallet],
  );

  const giftTips = useMemo(
    () => ({
      // A tip box only appears when there is a wallet open with something in it and a
      // contract to hold it. Otherwise a gift is a creature, exactly as it was.
      enabled: wallet.tipsSupported && wallet.account !== null,
      balance: wallet.status?.balance ?? 0n,
      decimals: wallet.status?.decimals ?? 18,
      busy: wallet.busy,
      onSend: (key: string, amount: bigint) => wallet.sendTip(key, amount),
      onReclaim: async (key: string) => {
        if ((await wallet.reclaimTip(key)) !== null) return "taken" as const;
        // It may have failed because somebody opened it while it sat in the list. That
        // is not an error to wave at the sender; it is the gift having worked.
        const now = await wallet.loadTip(key);
        return now?.opened ? ("gone" as const) : ("failed" as const);
      },
    }),
    [wallet],
  );

  const dailyChips = ["Rare · Daily Snarl", freedByLabel(freedToday)].filter(
    (chip): chip is string => chip !== null,
  );

  return (
    <PhoneFrame>
      {screen === "splash" && (
        <SplashScreen
          onBegin={begin}
          enabled={hydrated}
          returning={tutorialStep >= TUTORIAL_KNOTS.length}
          gate={{
            connected: wallet.account !== null,
            busy: wallet.busy,
            emailOffered: wallet.emailOffered,
            onConnectWallet: () => void startConnect(),
            onEmail: () => void wallet.connectWithEmail(),
          }}
        />
      )}

      {screen === "splash" && (
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
          <Toast message={toast.message} />
        </div>
      )}

      {screen === "puzzle" && (
        <PuzzleScreen
          key={`${creature.id}-${seed}-${tutorialStep}-${mode}`}
          creature={creature}
          seed={seed}
          caption={
            mode === "trail" && trailRun
              ? `${trailRun.trail.title} · ${trailRun.step + 1} of 3`
              : isWeekly
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
              : inTutorial && tutorialStep === 0
                ? "Drag a bead until no strings cross."
                : lastTutorialKnot && inTutorial
                  ? "Stuck? Hint shows one bead to move."
                  : ""
          }
          chips={isDaily ? dailyChips : undefined}
          withHand={inTutorial && tutorialStep === 0}
          almostFree={!inTutorial || tutorialStep > 0}
          showNudge={isDaily || !inTutorial || lastTutorialKnot}
          highlightNudge={!isDaily && inTutorial && lastTutorialKnot}
          nudgesLeft={nudges + extraNudges}
          onSpendNudge={spendNudge}
          onNoNudges={noNudges}
          nextLabel={
            mode === "trail" && trailRun
              ? trailRun.preview
                ? "Back to the trail"
                : trailRun.step < 2
                  ? "Next trail knot"
                  : "Finish trail"
              : isWeekly
                ? `Keep ${WEEKLY_CREATURE.name}`
                : !isDaily && inTutorial && !lastTutorialKnot
                  ? "Next knot"
                  : !isDaily && !inTutorial
                    ? "Keep & free the next one"
                    : "Release to the pond"
          }
          onNext={next}
          onPond={
            mode === "progress" && !inTutorial
              ? (moves, pos) => {
                  next(moves, pos);
                  toPond(false);
                }
              : undefined
          }
          onBack={() => {
            setMode("progress");
            setScreen(mode === "trail" ? "trails" : isWeekly ? "untangle" : "pond");
          }}
          toast={<Toast message={toast.message} />}
        />
      )}

      {screen === "pond" && (
        <PondScreen
          onPlay={() => setScreen("puzzle")}
          intro={intro}
          onToast={toast.show}
          dailySolved={dailySolved}
          onOpenDaily={openDaily}
          onGift={() => setScreen("gift")}
          onUntangle={() => setScreen("untangle")}
          onMore={() => (wallet.account ? setScreen("you") : void startConnect())}
          onSettings={() => setMoreSheet(true)}
          onJournal={() => setScreen("journal")}
          onTrails={() => setScreen("trails")}
          readMarket={wallet.readMarket}
          marketAccount={wallet.account?.address}
          onPreviewTrail={(trail) => {
            setTrailRun({ trail, step: 0, preview: true });
            setMode("trail");
            setScreen("puzzle");
          }}
          showWelcome={hydrated && !introSeen && !inTutorial && !gift}
          onDismissWelcome={markIntroSeen}
          {...(wallet.account ? { accountLabel: shortAddress(wallet.account.address) } : {})}
          claim={{
            state: claimState,
            status: wallet.status,
            busy: wallet.busy || wallet.checkingStatus,
            onAction: () => void onClaimAction(),
            onRefresh: () => void wallet.refresh(),
          }}
          toast={<Toast message={toast.message} />}
        />
      )}

      {screen === "journal" && (
        <JournalScreen onBack={() => setScreen("pond")} onTrails={() => setScreen("trails")} />
      )}
      {screen === "trails" && (
        <TrailsScreen
          wallet={wallet}
          onBack={() => toPond(false)}
          onConnect={() => void startConnect()}
          onVerify={() => void requestVerification()}
          onClaim={() => void onClaimAction()}
          onPlay={(trail, preview) => {
            setTrailRun({ trail, step: 0, preview });
            setMode("trail");
            setScreen("puzzle");
          }}
        />
      )}

      {wallets.length > 0 && (
        <WalletSheet
          wallets={wallets}
          onPick={(id) => {
            setWallets([]);
            void wallet.connect({ walletId: id });
          }}
          onClose={() => setWallets([])}
        />
      )}

      {moreSheet && (
        <MoreSheet
          onClose={() => setMoreSheet(false)}
          {...(wallet.account
            ? {
                account: {
                  address: wallet.account.address,
                  label: wallet.account.label,
                  busy: wallet.busy,
                  onCopy: () => {
                    void navigator.clipboard
                      ?.writeText(wallet.account?.address ?? "")
                      .then(() => toast.show("Address copied."))
                      .catch(() => toast.show("Could not copy. It is on screen."));
                  },
                  onSignOut: () => {
                    void wallet.disconnect().then(() => {
                      setMoreSheet(false);
                      // The game is behind the door, so signing out means going back to it.
                      setScreen("splash");
                      toast.show("Signed out.");
                    });
                  },
                },
              }
            : {})}
          {...(wallet.boardSupported
            ? {
                onBoard: () => {
                  setMoreSheet(false);
                  setScreen("board");
                },
              }
            : {})}
          {...(wantsAdmin
            ? {
                onWeeks: () => {
                  setMoreSheet(false);
                  setScreen("weeks");
                },
              }
            : {})}
        />
      )}

      {verifySheet && (
        <VerifySheet
          busy={wallet.busy || wallet.checkingStatus}
          account={wallet.account}
          statusError={wallet.statusError}
          onRefresh={() => void wallet.refresh()}
          onStart={() => void wallet.verify()}
          onClose={() => setVerifySheet(false)}
        />
      )}

      {screen === "you" && wallet.account && (
        <ProfileScreen
          account={wallet.account}
          status={wallet.status}
          statusError={wallet.statusError}
          onRefresh={() => void wallet.refresh()}
          standing={wallet.standing}
          busy={wallet.busy || wallet.checkingStatus}
          onBack={() => setScreen("pond")}
          onCopy={() => {
            void navigator.clipboard
              ?.writeText(wallet.account?.address ?? "")
              .then(() => toast.show("Address copied."))
              .catch(() => toast.show("Could not copy. It is on screen."));
          }}
          onSignOut={() => {
            void wallet.disconnect().then(() => {
              setScreen("splash");
              toast.show("Signed out.");
            });
          }}
          onBoard={() => setScreen("board")}
          onSettings={() => setMoreSheet(true)}
          onClaimName={wallet.claimName}
          onToast={toast.show}
          toast={<Toast message={toast.message} />}
        />
      )}

      {screen === "weeks" && (
        <AdminScreen
          state={wallet.admin}
          connected={wallet.account !== null}
          busy={wallet.busy}
          onBack={() => setScreen("pond")}
          onConnect={() => void startConnect()}
          onOpen={(week) => {
            void wallet.openWeek(week).then((done) => {
              if (done) toast.show("Week open. The pool starts at nothing.");
            });
          }}
          onSettle={(week) => {
            void wallet.settleWeek(week).then((done) => {
              if (done) toast.show("Settled. Entrants can collect.");
            });
          }}
        />
      )}

      {screen === "board" && (
        <BoardScreen
          standing={wallet.standing}
          connected={wallet.account !== null}
          busy={wallet.busy}
          onBack={() => setScreen("pond")}
          onConnect={() => void startConnect()}
          onClaimName={wallet.claimName}
          onProve={(slug) => void putOnBoard(slug)}
          onToast={toast.show}
        />
      )}

      {screen === "gift" && (
        <GiftScreen onBack={() => setScreen("pond")} onToast={toast.show} tips={giftTips} />
      )}

      {screen === "untangle" && (
        <GreatUntangle
          week={week}
          onBack={() => setScreen("pond")}
          onAddSolve={() => {
            setMode("weekly");
            setScreen("puzzle");
          }}
          chain={{
            status: wallet.week,
            busy: wallet.busy,
            freedHere: weeklyEarned,
            onEnter: () => void enterPool(),
            onCollect: () => void collectPool(),
            balance: wallet.status?.balance ?? 0n,
            canBack: wallet.account !== null && wallet.week !== null,
            onBack: (g$) => void backPool(g$),
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
            // The creature is kept either way — it is theirs from the moment they accept
            // it, and it will be in the pond when they get there. But the pond is behind
            // the door, and a gift link is not a way through it.
            const connected = wallet.account !== null;
            setScreen("pond");
            toast.show(
              connected
                ? creature
                  ? `${creature.name} joined your pond.`
                  : "Added to your pond."
                : `${creature?.name ?? "It"} is waiting in your pond. Come in and see.`,
            );
          }}
          onDecline={() => setGift(null)}
          tip={{
            status: giftTip,
            connected: wallet.account !== null,
            busy: wallet.busy,
            onConnect: () => void startConnect(),
            onTake: () => void takeGiftTip(),
          }}
        />
      )}
    </PhoneFrame>
  );
}

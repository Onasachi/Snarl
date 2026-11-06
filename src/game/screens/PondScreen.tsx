import { type CSSProperties, type ReactNode, useState } from "react";
import { audio, buzz, HAPTIC } from "~/audio";
import { creatureById } from "~/data";
import type { MoveKind } from "~/engine";
import { adventureLevel } from "~/game/adventure";
import { collection } from "~/game/collection";
import { FeaturedTrails } from "~/game/home/FeaturedTrails";
import { GoodDollar, type HomeClaim } from "~/game/home/GoodDollar";
import { MOON_PHASES, MOON_REWARD_NUDGES, TUTORIAL_KNOTS } from "~/game/progress";
import { useGame } from "~/game/store";
import { WorldScene } from "~/game/WorldScene";
import { endsLabel } from "~/game/weekly";
import { type MarketState, PALETTES, type Trail } from "~/market/types";
import { CreatureSvg } from "~/render/CreatureSvg";
import { Icon } from "~/render/Icon";
import { useThemeId } from "~/theme/ThemeProvider";

const SLOTS = [
  [50, 50],
  [25, 39],
  [76, 62],
  [71, 22],
  [28, 73],
  [50, 78],
  [85, 37],
  [13, 57],
  [49, 20],
  [64, 51],
] as const;
const IDLE: Record<MoveKind, string> = {
  swim: "sn-home-swim",
  bob: "sn-home-bob",
  walk: "sn-home-walk",
  sit: "sn-home-sit",
};

export function PondScreen({
  onPlay,
  onAdventure,
  onLeaderboard,
  onShop,
  intro,
  onToast,
  dailySolved,
  onOpenDaily,
  onGift,
  onUntangle,
  onMore,
  onSettings,
  onJournal,
  onTrails,
  onPreviewTrail,
  readMarket,
  accountLabel,
  marketAccount,
  showWelcome = false,
  onDismissWelcome,
  claim,
  toast,
}: {
  onPlay: () => void;
  onAdventure: () => void;
  onLeaderboard: () => void;
  onShop: () => void;
  intro: boolean;
  onToast: (message: string) => void;
  dailySolved: boolean;
  onOpenDaily: () => void;
  onGift: () => void;
  onUntangle: () => void;
  onMore: () => void;
  onSettings: () => void;
  onJournal: () => void;
  onTrails: () => void;
  onPreviewTrail: (trail: Trail) => void;
  readMarket: () => Promise<MarketState | null>;
  accountLabel?: string;
  marketAccount?: string;
  showWelcome?: boolean;
  onDismissWelcome: () => void;
  claim: HomeClaim;
  toast: ReactNode;
}) {
  const themeId = useThemeId();
  const freed = useGame((s) => s.freed);
  const palette = useGame((s) => s.pondPalette);
  const tutorialStep = useGame((s) => s.tutorialStep);
  const level = useGame((s) => s.adventureLevel);
  const adventure = adventureLevel(level);
  const restored = Math.min(20, Math.max(0, level - 1 - adventure.chapterIndex * 20));
  const moon = useGame((s) => s.moon);
  const { residents, known } = collection(freed);
  const nextCreature = TUTORIAL_KNOTS[tutorialStep] ?? adventure.creature;
  const [reacted, setReacted] = useState<Record<string, number>>({});
  const [greeting, setGreeting] = useState<string | null>(null);
  const actionCopy = {
    eyebrow:
      tutorialStep < TUTORIAL_KNOTS.length
        ? "YOUR FIRST RESCUES"
        : adventure.expedition
          ? "ENDLESS EXPEDITIONS"
          : `CHAPTER ${adventure.chapterIndex + 1} · ${adventure.chapter.name.toUpperCase()}`,
    title: "Continue adventure",
    detail:
      tutorialStep < TUTORIAL_KNOTS.length
        ? `Meet ${nextCreature.name}. Learn to untangle.`
        : adventure.expedition
          ? `Stage ${level - 100} · another friend is waiting`
          : `Level ${level} of 100 · rescue ${nextCreature.name}`,
    onClick: onPlay,
  };
  const rewardDetail =
    moon >= MOON_PHASES
      ? `${MOON_REWARD_NUDGES} extra hints earned! Your next daily puzzle starts a new cycle.`
      : `Finish daily puzzles to earn ${MOON_REWARD_NUDGES} extra hints. ${moon} of ${MOON_PHASES} complete. A missed day only sets you back one step.`;

  return (
    <div className="sn-home">
      <div className="sn-home-scroll">
        <header className="sn-home-header">
          <span className="sn-home-wordmark">
            snarl<span aria-hidden="true">.</span>
          </span>
          <div className="sn-home-header-actions">
            <button
              type="button"
              className="sn-home-icon-button"
              aria-label="Settings"
              onClick={onSettings}
            >
              <Icon name="settings" size={18} />
            </button>
            <button
              className="sn-home-icon-button"
              type="button"
              aria-label="Gift a creature"
              onClick={onGift}
            >
              <Icon name="gift" size={20} />
            </button>
            <button
              className="sn-home-account"
              type="button"
              onClick={onMore}
              aria-label={accountLabel ? `Your profile, ${accountLabel}` : "Connect your wallet"}
            >
              <Icon name="person" size={17} />
              <span>{accountLabel ?? "Connect"}</span>
            </button>
          </div>
        </header>

        <main className="sn-home-main">
          <section className="sn-home-habitat" aria-labelledby="home-title">
            <div className="sn-home-pond-heading">
              <div>
                <span className="sn-home-eyebrow">YOUR LITTLE WORLD</span>
                <h1 id="home-title">{adventure.chapter.name}</h1>
              </div>
              <span className="sn-home-resident-count">
                <strong>{known.size}</strong>
                <span>{known.size === 1 ? "friend" : "friends"}</span>
              </span>
            </div>
            <div
              className="sn-home-pond"
              data-intro={intro || undefined}
              style={
                palette > 0
                  ? ({
                      "--home-water":
                        themeId === "paper"
                          ? PALETTES[palette]?.lightWater
                          : PALETTES[palette]?.water,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 0 12px",
                  color: adventure.chapter.color,
                  pointerEvents: "none",
                }}
              >
                <WorldScene chapter={adventure.chapterIndex} restored={restored} compact />
              </div>
              {residents.map((entry, i) => {
                const creature = creatureById(entry.id);
                if (!creature) return null;
                const slot = SLOTS[i]!;
                const size = residents.length <= 3 ? 71 : residents.length <= 6 ? 58 : 46;
                return (
                  <div
                    className="sn-home-resident"
                    key={entry.key}
                    style={
                      {
                        left: `${slot[0]}%`,
                        top: `${slot[1]}%`,
                        width: size,
                        height: size,
                        "--idle": IDLE[creature.move],
                        "--duration": `${9 + i * 2}s`,
                        "--delay": `${-i * 2}s`,
                      } as CSSProperties
                    }
                  >
                    <div className="sn-home-resident-swim">
                      <button
                        key={`${entry.key}-${reacted[entry.key] ?? 0}`}
                        data-reacted={reacted[entry.key] ? true : undefined}
                        type="button"
                        aria-label={`Say hello to ${creature.name}, ${creature.shape}`}
                        onClick={() => {
                          audio.init();
                          audio.creature(creature.sound);
                          buzz(HAPTIC.tap);
                          setReacted((r) => ({ ...r, [entry.key]: Date.now() }));
                          setGreeting(`${creature.name} says hello!`);
                        }}
                      >
                        <CreatureSvg
                          creature={creature}
                          state="free"
                          eyes="open"
                          r={5.4}
                          sw={2.6}
                          still
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              <span className="sn-home-pond-caption" aria-live="polite">
                {greeting ??
                  (showWelcome
                    ? "Your first friends are home. Tap to say hello."
                    : known.size
                      ? "Tap a friend. Make their day."
                      : "Your first friend is waiting below.")}
              </span>
            </div>
            <button type="button" className="sn-world-progress" onClick={onAdventure}>
              <span>
                <strong>
                  {adventure.expedition
                    ? "The world is restored"
                    : `${Math.min(level - 1, 100)}/100 story levels complete`}
                </strong>
                <small>
                  {adventure.expedition
                    ? "Endless expeditions are open"
                    : adventure.chapter.mission}
                </small>
              </span>
              <span>World map →</span>
            </button>
          </section>

          <button
            className="sn-home-next"
            type="button"
            onClick={() => {
              onDismissWelcome();
              actionCopy.onClick();
            }}
          >
            <span className="sn-home-play-icon" aria-hidden="true">
              ▶
            </span>
            <span className="sn-home-next-copy">
              <span>{actionCopy.eyebrow}</span>
              <strong>{actionCopy.title}</strong>
              <small>{actionCopy.detail}</small>
            </span>
            <span className="sn-home-next-creature" aria-hidden="true">
              <CreatureSvg
                creature={nextCreature}
                themeId="paper"
                state="free"
                eyes="open"
                r={4.6}
                sw={2}
                still
              />
            </span>
          </button>

          <GoodDollar claim={claim} onTrails={onShop} />
          <button type="button" className="sn-world-progress" onClick={onShop}>
            <span>
              <strong>G$ supplies</strong>
              <small>Hints · helping hands · firefly vision</small>
            </span>
            <span>Shop →</span>
          </button>
          <FeaturedTrails
            readMarket={readMarket}
            {...(marketAccount ? { account: marketAccount } : {})}
            onBrowse={onTrails}
            onPreview={onPreviewTrail}
          />

          <section className="sn-home-challenges" aria-label="Daily and weekly challenges">
            <button type="button" className="sn-home-challenge" onClick={onOpenDaily}>
              <Icon name={dailySolved ? "check" : "moon"} size={20} />
              <span className="sn-home-challenge-copy">
                <strong>Daily puzzle</strong>
                <small>{dailySolved ? "Done! Back tomorrow" : "Meet the Moon Moth"}</small>
              </span>
              <Icon name="chevron" size={13} />
            </button>
            <button type="button" className="sn-home-challenge" onClick={onUntangle}>
              <Icon name="knot" size={20} />
              <span className="sn-home-challenge-copy">
                <strong>Weekly puzzle</strong>
                <small>{endsLabel()}</small>
              </span>
              <Icon name="chevron" size={13} />
            </button>
          </section>
          <button
            type="button"
            className="sn-home-daily-progress"
            onClick={() => onToast(rewardDetail)}
            aria-label={rewardDetail}
          >
            <span className="sn-home-week-dots" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <i key={day} data-filled={day <= moon || undefined}>
                  {day <= moon ? "✓" : "·"}
                </i>
              ))}
            </span>
            <span>
              {moon >= MOON_PHASES ? "+7 hints earned!" : `${moon}/7 daily puzzles → 7 extra hints`}
            </span>
          </button>
        </main>
      </div>
      <div className="sn-home-toast">{toast}</div>
      <nav className="sn-home-nav" aria-label="Main navigation">
        <span aria-current="page">
          <Icon name="pond" size={21} />
          Home
        </span>
        <button type="button" onClick={onJournal}>
          <Icon name="journal" size={21} />
          Collection
        </button>
        <button type="button" onClick={onTrails}>
          <Icon name="shop" size={21} />
          Market
        </button>
        <button type="button" onClick={onLeaderboard}>
          <Icon name="board" size={21} />
          Scores
        </button>
      </nav>
    </div>
  );
}

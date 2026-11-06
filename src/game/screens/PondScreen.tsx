import { type CSSProperties, type ReactNode, useState } from "react";
import { audio, buzz, HAPTIC } from "~/audio";
import { CREATURES, creatureById } from "~/data";
import type { MoveKind } from "~/engine";
import { collection, nextExplorationIndex } from "~/game/collection";
import { DAILY_CREATURE } from "~/game/daily";
import { nextHomeAction } from "~/game/home";
import { FeaturedTrails } from "~/game/home/FeaturedTrails";
import { GoodDollar, type HomeClaim } from "~/game/home/GoodDollar";
import { creatureForPlay, MOON_PHASES, MOON_REWARD_NUDGES, TUTORIAL_KNOTS } from "~/game/progress";
import { useGame } from "~/game/store";
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
  const storedPlayIndex = useGame((s) => s.playIndex);
  const moon = useGame((s) => s.moon);
  const { residents, known, world, next: milestone } = collection(freed);
  const nextCreature =
    TUTORIAL_KNOTS[tutorialStep] ?? creatureForPlay(nextExplorationIndex(storedPlayIndex, freed));
  const action = nextHomeAction({
    tutorialStep,
    residents: known.size,
    worldCount: world,
    dailySolved,
  });
  const [reacted, setReacted] = useState<Record<string, number>>({});
  const [greeting, setGreeting] = useState<string | null>(null);
  const actionCopy = {
    learn: {
      eyebrow: "YOUR NEXT LITTLE WIN",
      title: `Rescue ${nextCreature.name}`,
      detail: "Move the beads. Untangle a new friend.",
      onClick: onPlay,
    },
    rescue: {
      eyebrow: "YOUR NEXT ADVENTURE",
      title: `Rescue ${nextCreature.name}`,
      detail: "There's room for one more friend.",
      onClick: onPlay,
    },
    daily: {
      eyebrow: "TODAY'S ADVENTURE",
      title: "Rescue the Moon Moth",
      detail: "A fresh daily puzzle. A rare little friend.",
      onClick: onOpenDaily,
    },
    trails: {
      eyebrow: "KEEP EXPLORING",
      title: "Find your next adventure",
      detail: "Discover a trail made by another player.",
      onClick: onTrails,
    },
  }[action];
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
                <h1 id="home-title">
                  {known.size === 0 ? "Room for a little magic." : "Look who's settling in."}
                </h1>
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
              <svg
                className="sn-home-landscape"
                viewBox="0 0 350 155"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="sn-home-shore"
                  d="M23 34C46 8 103 25 131 15S204 2 231 17 303 8 326 31 350 93 323 122 245 131 218 140 150 133 124 140 43 137 23 117-3 59 23 34Z"
                />
                <path
                  className="sn-home-water-shape"
                  d="M28 38C51 15 104 31 135 22S204 10 232 24 301 15 322 38 339 90 316 115 246 124 217 133 151 127 124 133 49 130 29 111 7 62 28 38Z"
                />
                <g className="sn-home-ripples" fill="none">
                  <ellipse cx="174" cy="82" rx="77" ry="29" />
                  <ellipse cx="174" cy="82" rx="100" ry="39" />
                  <path d="M65 61q18-10 34-3M254 97q18 8 31-2" />
                </g>
                <g className="sn-home-reeds">
                  <path d="M17 108q-8-24-6-39m8 43q6-32 19-39m-18 36q-4-21 2-33M326 48q-5-23 3-35m-1 37q9-26 20-27" />
                </g>
                <g className="sn-home-stones">
                  <ellipse cx="30" cy="127" rx="11" ry="6" />
                  <ellipse cx="47" cy="133" rx="7" ry="4" />
                  <ellipse cx="309" cy="28" rx="9" ry="5" />
                </g>
                {world >= 3 && (
                  <g className="sn-home-lilies">
                    <path d="M59 45a18 9 0 1 0 3-1l-3 1 9 4Z" />
                    <path d="M289 111a21 10 0 1 0 3-1l-3 1 11 4Z" />
                  </g>
                )}
                {world >= 6 && (
                  <g className="sn-home-reeds">
                    <path d="M292 140q6-27-1-41m5 42q12-28 21-30" />
                  </g>
                )}
                {world >= 10 && (
                  <path
                    className="sn-home-lotus"
                    d="M286 111q-19-8-14-17 12-2 14 17-7-20 2-24 9 6-2 24 10-18 18-12 0 9-18 12Z"
                  />
                )}
                <g className="sn-home-fireflies">
                  <circle cx="87" cy="26" r="1.7" />
                  <circle cx="267" cy="48" r="2" />
                  <circle cx="228" cy="125" r="1.5" />
                </g>
              </svg>
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
            <div className="sn-home-growth">
              <span>
                {milestone ? (
                  <>
                    <strong>Next upgrade:</strong> {milestone.name.toLowerCase()}
                  </>
                ) : (
                  <>
                    <Icon name="check" size={13} /> Your pond is fully restored
                  </>
                )}
              </span>
              <span
                className="sn-home-growth-dots"
                role="img"
                aria-label={`${world} of ${CREATURES.length} original creatures rescued`}
              >
                {CREATURES.map((c) => (
                  <i key={c.id} data-filled={known.has(c.id) || undefined} />
                ))}
              </span>
            </div>
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
                creature={action === "daily" ? DAILY_CREATURE : nextCreature}
                themeId="paper"
                state="free"
                eyes="open"
                r={4.6}
                sw={2}
                still
              />
            </span>
          </button>

          <GoodDollar claim={claim} onTrails={onTrails} />
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
          Trails
        </button>
        <button type="button" onClick={onSettings}>
          <Icon name="settings" size={21} />
          Settings
        </button>
      </nav>
    </div>
  );
}

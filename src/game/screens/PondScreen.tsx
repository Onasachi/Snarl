import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { audio, buzz, HAPTIC } from "~/audio";
import { CREATURES, creatureById } from "~/data";
import type { Creature, MoveKind } from "~/engine";
import { ActivityTile } from "~/game/ActivityTile";
import { ClaimCard } from "~/game/ClaimCard";
import { collection } from "~/game/collection";
import { Intro } from "~/game/Intro";
import { Moon } from "~/game/Moon";
import { MOON_PHASES, MOON_REWARD_NUDGES } from "~/game/progress";
import { type FreedCreature, useGame } from "~/game/store";
import { endsLabel } from "~/game/weekly";
import { useReducedMotion } from "~/hooks/useReducedMotion";
import { PALETTES } from "~/market/types";
import { CreatureSvg } from "~/render/CreatureSvg";
import { Icon } from "~/render/Icon";
import { useThemeId } from "~/theme/ThemeProvider";
import type { ClaimCardState, ClaimStatus } from "~/wallet";

/**
 * Ten places to be, in the order they fill.
 *
 * Ordered, not just spread: the first creature takes the middle of the pond and the next
 * few balance around it, so a pond with one creature in it looks like a pond with a
 * creature in it rather than a blank panel with something parked in the corner. Beyond
 * ten, creatures share.
 */
const SLOTS: readonly (readonly [number, number])[] = [
  [50, 44],
  [28, 28],
  [72, 58],
  [70, 20],
  [24, 64],
  [50, 76],
  [84, 40],
  [14, 44],
  [62, 70],
  [36, 32],
];

/**
 * How much bigger everything is when the pond is nearly empty.
 *
 * The creatures are the best thing here and the reward for everything else, so they
 * should not be small just because there are not many yet. They shrink back as the pond
 * fills and the space is genuinely needed.
 */
const roominessFor = (count: number): number =>
  count <= 2 ? 1.55 : count <= 4 ? 1.3 : count <= 6 ? 1.15 : 1;

/** Each creature idles the way its own body would. */
const IDLE: Record<MoveKind, readonly [string, number]> = {
  swim: ["sn-swim", 16],
  bob: ["sn-bob", 5],
  walk: ["sn-walk", 14],
  sit: ["sn-sit", 4],
};

export function PondScreen({
  onPlay,
  intro,
  onToast,
  dailySolved,
  dailySubtitle,
  onOpenDaily,
  onGift,
  onUntangle,
  onMore,
  onJournal,
  onTrails,
  accountLabel,
  showWelcome = false,
  onDismissWelcome = () => {},
  onWelcomeDaily = onOpenDaily,
  playLabel = "Play · World 1",
  claim,
  toast,
}: {
  onPlay: () => void;
  /** True just after the tutorial, when the first creatures rise into the water. */
  intro: boolean;
  onToast: (message: string) => void;
  dailySolved: boolean;
  dailySubtitle: string | null;
  onOpenDaily: () => void;
  onGift: () => void;
  onUntangle: () => void;
  onMore: () => void;
  onJournal: () => void;
  onTrails: () => void;
  /** A name or a short address, shown in place of "More" once somebody is signed in. */
  accountLabel?: string;
  showWelcome?: boolean;
  onDismissWelcome?: () => void;
  onWelcomeDaily?: () => void;
  playLabel?: string;
  /** Rendered above the bottom stack. */
  toast: ReactNode;
  /** The G$ layer. Entirely optional: with no wallet the pond is exactly as it was. */
  claim: {
    state: ClaimCardState;
    status: ClaimStatus | null;
    hasWallet: boolean;
    busy: boolean;
    onAction: () => void;
  };
}) {
  const reduce = useReducedMotion();
  const themeId = useThemeId();
  const freed = useGame((s) => s.freed);
  const palette = useGame((s) => s.pondPalette);
  const { residents, next: milestone } = collection(freed);

  /** How much of World 1 is in the pond, counting each creature once. */
  const worldFreed = useMemo(() => {
    const kinds = new Set(freed.map((entry) => entry.id));
    return CREATURES.filter((creature) => kinds.has(creature.id)).length;
  }, [freed]);
  const moon = useGame((s) => s.moon);
  const [reacted, setReacted] = useState<Record<string, number>>({});

  const tap = (entry: FreedCreature, creature: Creature) => {
    audio.init();
    audio.creature(creature.sound);
    buzz(HAPTIC.tap);
    setReacted((r) => ({ ...r, [entry.key]: Date.now() }));
  };

  const moonTap = () =>
    onToast(
      moon >= MOON_PHASES
        ? "Full moon. Your next Daily starts a new cycle."
        : `${MOON_PHASES - moon} more Daily Snarls for a full moon and ${MOON_REWARD_NUDGES} nudges. Missing a day only dims it one phase.`,
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "calc(12px + env(safe-area-inset-top)) 12px 12px",
        }}
      >
        <Moon moon={moon} onTap={moonTap} />
        <div style={{ display: "flex", gap: 6 }}>
          <HeaderButton onClick={onGift} muted={false} label="Gift a creature">
            <Icon name="gift" size={16} />
          </HeaderButton>
          {/* Who you are, where you can see it. The game asks for a login before it
              will start, so "which account am I in?" should not be a question answered
              three taps deep under a theme picker. */}
          <HeaderButton onClick={onMore}>
            <Icon name="person" size={16} />
            {accountLabel ?? "Connect"}
          </HeaderButton>
        </div>
      </header>

      {showWelcome && (
        <Intro onDone={onDismissWelcome} onDaily={onWelcomeDaily} dailySolved={dailySolved} />
      )}

      <main
        className="sn-water"
        style={{
          flex: "1 0 200px",
          minHeight: 200,
          ...(palette > 0
            ? {
                background:
                  themeId === "paper" ? PALETTES[palette]?.lightWater : PALETTES[palette]?.water,
              }
            : {}),
        }}
      >
        <svg
          className="sn-habitat"
          viewBox="0 0 390 250"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="none" stroke="var(--leaf)" strokeWidth=".7" opacity=".24">
            <ellipse cx="48" cy="202" rx="35" ry="14" />
            <ellipse cx="318" cy="48" rx="29" ry="12" />
          </g>
          <g fill="var(--moon)" className="sn-pond-motes">
            <circle cx="56" cy="48" r="1.5" />
            <circle cx="345" cy="117" r="1.2" />
            <circle cx="184" cy="216" r="1.4" />
          </g>
          {worldFreed >= 3 && (
            <g fill="var(--leaf)" opacity=".65">
              <path d="M28 200a24 10 0 1 0 3-2l-3 2 10 3Z" />
              <path d="M300 46a20 8 0 1 0 3-2l-3 2 10 3Z" />
              <ellipse cx="340" cy="214" rx="28" ry="10" />
            </g>
          )}
          {worldFreed >= 6 && (
            <g fill="none" stroke="var(--leaf)" strokeWidth="2" opacity=".65">
              <path d="M0 245Q25 190 16 153M8 250Q36 215 31 177M390 245Q365 180 377 143M382 250Q355 218 359 175" />
            </g>
          )}
          {worldFreed >= 10 && (
            <g fill="var(--lotus)" opacity=".9">
              <path d="M333 210Q309 193 323 189Q335 190 333 210Q339 183 349 193Q354 202 333 210Q326 182 335 179Q345 187 333 210Z" />
            </g>
          )}
        </svg>
        {freed.length === 0 ? (
          <EmptyPond onPlay={onPlay} />
        ) : (
          residents.map((entry, k) => {
            const creature = creatureById(entry.id);
            if (!creature) return null;
            const slot = SLOTS[k % SLOTS.length]!;
            const size = Math.round(
              (62 + creature.nodes.length * 1.6) * roominessFor(residents.length),
            );
            const [idleName, idleSeconds] = IDLE[creature.move];
            const reactedAt = reacted[entry.key];

            return (
              <div
                key={entry.key}
                style={{
                  position: "absolute",
                  left: `${slot[0]}%`,
                  top: `${slot[1]}%`,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  animation:
                    intro && !reduce
                      ? `sn-enter 1.6s ${(k * 0.25).toFixed(2)}s cubic-bezier(.2,.8,.2,1) both`
                      : "none",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    animation: reduce
                      ? "none"
                      : `${idleName} ${idleSeconds + k * 1.3}s ease-in-out ${-k * 2.1}s infinite`,
                  }}
                >
                  <button
                    type="button"
                    // Remounting on each tap is what replays the hop.
                    key={`react-${reactedAt ?? 0}`}
                    onClick={() => tap(entry, creature)}
                    aria-label={`${creature.name}, ${creature.shape}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      animation: reactedAt && !reduce ? "sn-react .65s ease" : "none",
                    }}
                  >
                    <CreatureSvg
                      creature={creature}
                      state="free"
                      eyes="open"
                      r={5.4}
                      sw={2.4}
                      still
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* The toast hangs off the top of this stack, so it can never cover the cards. */}
      <footer
        data-bottom-stack
        style={{
          position: "relative",
          display: "grid",
          gap: 10,
          padding: "12px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        {toast}

        {/* Two places to go, side by side, rather than two more bars across the screen. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ActivityTile
            icon="knot"
            label="Great Untangle"
            status={endsLabel()}
            onClick={onUntangle}
          />
          <ActivityTile
            icon="moon"
            accent="discovery"
            label="Daily Snarl"
            status={
              dailySolved
                ? "Freed · back tomorrow"
                : (dailySubtitle ??
                  `Rare knot · ${moon >= MOON_PHASES ? 0 : moon}/${MOON_PHASES} to bonus`)
            }
            tone={dailySolved ? "done" : "plain"}
            onClick={onOpenDaily}
          />
        </div>

        <div className="sn-pond-nav">
          <button className="sn-link" type="button" onClick={onJournal}>
            <Icon name="journal" size={16} />
            Journal · {worldFreed}/{CREATURES.length}
          </button>
          <button className="sn-link" type="button" onClick={onTrails}>
            <Icon name="shop" size={16} />
            Trail market · G$
          </button>
        </div>

        <ClaimCard
          state={claim.state}
          status={claim.status}
          hasWallet={claim.hasWallet}
          busy={claim.busy}
          onAction={claim.onAction}
        />

        {/* An empty pond already offers "Free your first Snarl"; two buttons for one
            action is one too many. */}
        {freed.length > 0 && (
          <>
            {/* Somewhere to be going. A pond fills, and until now nothing said how full. */}
            <div style={{ display: "grid", gap: 5 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--ink2)",
                }}
              >
                <span>
                  {milestone
                    ? `${milestone.name} at ${milestone.count} creatures`
                    : "Lotus pond restored"}
                </span>
                <span className="tnum">
                  {worldFreed} of {CREATURES.length}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 999,
                  background: "var(--card-line)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.round((worldFreed / CREATURES.length) * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "var(--accent)",
                    transition: "width .6s cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="sn-primary"
              onClick={onPlay}
              style={{
                width: "100%",
                minHeight: 52,
                border: "none",
                borderRadius: 16,
                fontSize: 18,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {playLabel}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
  muted = true,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  muted?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        minWidth: 44,
        justifyContent: "center",
        minHeight: 44,
        padding: "0 10px",
        border: "1px solid var(--card-line)",
        borderRadius: 999,
        background: "transparent",
        color: muted ? "var(--ink2)" : "var(--accent2)",
        fontSize: 13,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EmptyPond({ onPlay }: { onPlay: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Your pond is empty</h2>
      <p style={{ fontSize: 19, color: "var(--ink2)", margin: 0 }}>
        Everyone you free will swim here.
      </p>
      <button
        type="button"
        className="sn-primary"
        onClick={onPlay}
        style={{
          marginTop: 16,
          minHeight: 48,
          padding: "0 22px",
          border: "1px solid var(--card-line)",
          borderRadius: 16,
          fontSize: 17,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Free your first Snarl
      </button>
    </div>
  );
}

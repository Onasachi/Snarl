import { useState } from "react";
import { audio, buzz, HAPTIC } from "~/audio";
import { creatureById } from "~/data";
import type { Creature, MoveKind } from "~/engine";
import { Moon } from "~/game/Moon";
import { MOON_PHASES } from "~/game/progress";
import { type FreedCreature, useGame } from "~/game/store";
import { useReducedMotion } from "~/hooks/useReducedMotion";
import { CreatureSvg } from "~/render/CreatureSvg";

/** Ten places to be, spread so nothing important overlaps. Beyond ten, creatures share. */
const SLOTS: readonly (readonly [number, number])[] = [
  [26, 22],
  [70, 16],
  [50, 46],
  [22, 66],
  [76, 60],
  [48, 82],
  [84, 38],
  [14, 42],
  [62, 72],
  [36, 30],
];

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
}: {
  onPlay: () => void;
  /** True just after the tutorial, when the first creatures rise into the water. */
  intro: boolean;
  onToast: (message: string) => void;
}) {
  const reduce = useReducedMotion();
  const freed = useGame((s) => s.freed);
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
        ? "Full moon. A visitor is on the way."
        : "Solve the Daily Snarl to grow the moon. Missing a day only dims it one phase.",
    );

  const stub = () => onToast("The Journal and the Shop are still being built.");

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 12px",
        }}
      >
        <Moon moon={moon} onTap={moonTap} />
        <div style={{ display: "flex", gap: 6 }}>
          <StubButton onClick={stub}>Journal</StubButton>
          <StubButton onClick={stub}>Shop</StubButton>
        </div>
      </header>

      <main style={{ flex: 1, position: "relative", background: "var(--water)", minHeight: 0 }}>
        {freed.length === 0 ? (
          <EmptyPond onPlay={onPlay} />
        ) : (
          freed.map((entry, k) => {
            const creature = creatureById(entry.id);
            if (!creature) return null;
            const slot = SLOTS[k % SLOTS.length]!;
            const size = Math.round(62 + creature.nodes.length * 1.6);
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

      {/* An empty pond already offers "Free your first Snarl"; two buttons for one action
          is one too many, so the footer only exists once there is something to come back to. */}
      <footer
        style={{
          padding: "16px 20px calc(20px + env(safe-area-inset-bottom))",
          display: freed.length === 0 ? "none" : "block",
        }}
      >
        <button
          type="button"
          onClick={onPlay}
          style={{
            width: "100%",
            minHeight: 52,
            border: "none",
            borderRadius: 16,
            background: "var(--ink)",
            color: "var(--bg)",
            fontSize: 18,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Play · World 1
        </button>
      </footer>
    </>
  );
}

function StubButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: "0 14px",
        border: "1px solid var(--card-line)",
        borderRadius: 999,
        background: "transparent",
        color: "var(--ink2)",
        fontSize: 14,
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
        onClick={onPlay}
        style={{
          marginTop: 16,
          minHeight: 48,
          padding: "0 22px",
          border: "1px solid var(--card-line)",
          borderRadius: 16,
          background: "transparent",
          color: "var(--ink)",
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

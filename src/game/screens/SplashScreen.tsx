import type React from "react";
import { useEffect, useRef, useState } from "react";
import { audio } from "~/audio";
import { TUTORIAL } from "~/data";
import { crossings, type Pt, scramble, solvedLayout } from "~/engine";
import { useReducedMotion } from "~/hooks/useReducedMotion";
import { CreatureSvg } from "~/render/CreatureSvg";
import { Icon } from "~/render/Icon";

const BUB = TUTORIAL[0]!;
const PAD = 12;

/**
 * Bub unties itself while the player watches, which is the whole game in four beads.
 * It is also where the audio context gets its first user gesture: nothing can make a
 * sound until Begin is pressed.
 */
export interface SplashGate {
  /** True once a wallet is open. Optional; the first rescue needs no wallet. */
  connected: boolean;
  /** A connection is being made, or one is being resumed from a previous visit. */
  busy: boolean;
  /** False when no Web3Auth client id is configured, and then there is no email door. */
  emailOffered: boolean;
  onConnectWallet: () => void;
  onEmail: () => void;
}

export function SplashScreen({
  onBegin,
  enabled = true,
  returning = false,
  gate,
}: {
  onBegin: () => void;
  enabled?: boolean;
  returning?: boolean;
  /**
   * Who may come in. The splash is the door rather than a screen in front of a door:
   * it is already the first thing, already says what snarl is, and a second screen
   * saying the same thing with buttons on it would only be a wall.
   */
  gate: SplashGate;
}) {
  const reduce = useReducedMotion();
  const [pos, setPos] = useState<Pt[]>(() => scramble(BUB, 0, PAD) ?? solvedLayout(BUB.nodes, PAD));
  const [freed, setFreed] = useState(false);
  const [ready, setReady] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const from = scramble(BUB, 0, PAD) ?? solvedLayout(BUB.nodes, PAD);
    const to = solvedLayout(BUB.nodes, PAD);
    setPos(from);

    if (reduce) {
      setPos(to);
      setFreed(true);
      setReady(true);
      return;
    }

    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    let start = 0;
    const timers = [
      window.setTimeout(() => {
        const step = (now: number) => {
          start ||= now;
          const t = Math.min(1, (now - start) / 1300);
          const e = ease(t);
          setPos(
            from.map(
              (p, i) => [p[0] + (to[i]![0] - p[0]) * e, p[1] + (to[i]![1] - p[1]) * e] as Pt,
            ),
          );
          if (t < 1) raf.current = requestAnimationFrame(step);
          else {
            setFreed(true);
            timers.push(window.setTimeout(() => setReady(true), 500));
          }
        };
        raf.current = requestAnimationFrame(step);
      }, 700),
    ];

    return () => {
      cancelAnimationFrame(raf.current);
      for (const t of timers) clearTimeout(t);
    };
  }, [reduce]);

  const begin = () => {
    if (!enabled) return;
    audio.init();
    audio.chime();
    onBegin();
  };

  return (
    <div
      className="sn-splash"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "safe center",
        padding: "24px 20px calc(28px + env(safe-area-inset-bottom))",
        gap: 8,
      }}
    >
      <div
        className={freed && !reduce ? "sn-freed" : undefined}
        style={{
          width: 150,
          height: 150,
          animation: freed && !reduce ? "sn-freed .7s cubic-bezier(.3,.7,.3,1)" : undefined,
        }}
      >
        <CreatureSvg
          creature={BUB}
          pos={pos}
          state={freed ? "free" : "tangled"}
          crossings={freed ? [] : crossings(pos, BUB.edges)}
          eyes={freed ? "open" : "shut"}
          r={9}
          sw={3.4}
        />
      </div>

      {/* The name comes undone with the knot: each letter starts loose and low and
          settles into line, a beat after the one before it. */}
      <h1
        style={{
          display: "flex",
          fontSize: 68,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          margin: "8px 0 0",
        }}
      >
        <span className="sr-only">snarl</span>
        {"snarl".split("").map((letter, i) => (
          <span
            key={letter}
            aria-hidden="true"
            style={
              {
                display: "inline-block",
                ...(reduce
                  ? {}
                  : {
                      "--sn-tilt": `${(i % 2 ? 1 : -1) * (4 + i)}deg`,
                      animation: `sn-settle .5s cubic-bezier(.2,.9,.3,1) ${0.75 + i * 0.09}s both`,
                    }),
              } as React.CSSProperties
            }
          >
            {letter}
          </span>
        ))}
      </h1>
      <p
        style={{
          fontSize: 19,
          color: "var(--ink2)",
          margin: 0,
          textAlign: "center",
          ...(reduce ? {} : { animation: "sn-fade .8s ease-out 1.3s both" }),
        }}
      >
        Untangle a knot. Free a creature.
      </p>

      {/* What is behind the door. It asks for a wallet before showing a single knot, so
          it had better say what is being asked for — three plain facts, not a pitch. */}
      {!gate.connected && (
        <ul
          style={{
            display: "grid",
            gap: 7,
            margin: "18px 0 0",
            padding: 0,
            listStyle: "none",
            ...(reduce ? {} : { animation: "sn-fade .8s ease-out 1.5s both" }),
          }}
        >
          {[
            ["knot", "100 story levels. Five places to restore. A pond full of friends."],
            ["moon", "Daily challenges and endless expeditions. Always another rescue."],
            ["coin", "Use G$ for hints, helpful boosts and player-made trails."],
          ].map(([icon, text]) => (
            <li
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                lineHeight: 1.35,
                color: "var(--ink2)",
                textAlign: "left",
              }}
            >
              <Icon name={icon as "knot" | "moon" | "coin"} size={17} />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: "grid",
          gap: 10,
          width: "100%",
          maxWidth: 300,
          marginTop: 22,
          opacity: ready && enabled ? 1 : 0,
          transition: "opacity .6s ease",
        }}
      >
        <button type="button" onClick={begin} disabled={!enabled} style={filled}>
          {returning ? "Back to your pond" : "Free your first creature"}
        </button>
        {!gate.connected && (
          <>
            <button
              type="button"
              onClick={gate.onConnectWallet}
              disabled={gate.busy}
              style={{ ...outline, opacity: gate.busy ? 0.6 : 1 }}
            >
              {gate.busy ? "…" : "Connect wallet"}
            </button>
            {gate.emailOffered && (
              <button type="button" onClick={gate.onEmail} disabled={gate.busy} style={outline}>
                Log in with email
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const filled = {
  minHeight: 52,
  border: "none",
  borderRadius: 16,
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontSize: 18,
  fontWeight: 500,
  cursor: "pointer",
} as const;

const outline = {
  minHeight: 52,
  border: "1px solid var(--card-line)",
  borderRadius: 16,
  background: "transparent",
  color: "var(--ink)",
  fontSize: 17,
  fontWeight: 500,
  cursor: "pointer",
} as const;

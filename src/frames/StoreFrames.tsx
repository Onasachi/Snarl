import type { ReactNode } from "react";
import { CREATURES, creatureColor, RARE, TUTORIAL, WEEKLY } from "~/data";
import { crossings, scramble, solvedLayout } from "~/engine";
import { ClaimCard } from "~/game/ClaimCard";
import { DailyCard } from "~/game/DailyCard";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * The four frames the brand doc storyboards, built from the real renderer and the real
 * cards rather than drawn again by hand — a frame that drifts from the game is worse than
 * no frame.
 *
 * Each is exactly 1290 × 2796, the largest size the stores ask for; everything else they
 * want is a downscale of it. `?frames=1` shows them small enough to look at, `&scale=1`
 * renders them at full size for capture. Development builds only.
 */

const WIDTH = 1290;
const HEIGHT = 2796;
/** The pond's cards are drawn for a 390pt phone; this is how much to blow them up. */
const CARD_SCALE = 2.7;

const HERO = CREATURES[9]!;
const POND = [CREATURES[0]!, TUTORIAL[1]!, CREATURES[3]!, WEEKLY, TUTORIAL[0]!, CREATURES[5]!];
const POND_SLOTS: readonly (readonly [number, number])[] = [
  [24, 16],
  [68, 10],
  [46, 40],
  [20, 64],
  [74, 58],
  [48, 84],
];

function Frame({
  headline,
  sub,
  children,
}: {
  headline: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "180px 110px 140px",
        background: "var(--bg)",
        color: "var(--ink)",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          fontSize: 118,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: 0,
          textAlign: "center",
        }}
      >
        {headline}
      </h2>
      <p
        style={{
          fontSize: 52,
          lineHeight: 1.3,
          color: "var(--ink2)",
          margin: "28px 0 0",
          textAlign: "center",
        }}
      >
        {sub}
      </p>
      <div
        style={{
          flex: 1,
          width: "100%",
          marginTop: 110,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </section>
  );
}

const Counter = ({ count }: { count: number }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
    <span
      className="tnum"
      style={{ fontSize: 150, fontWeight: 600, lineHeight: 1, color: "var(--warm)" }}
    >
      {count}
    </span>
    <span style={{ fontSize: 52, color: "var(--ink2)" }}>crossings</span>
  </div>
);

export function StoreFrames({ scale }: { scale: number }) {
  const tangled = scramble(HERO, 9, 10) ?? solvedLayout(HERO.nodes, 10);
  const tangledCount = crossings(tangled, HERO.edges).length;

  return (
    <div
      style={{
        display: "flex",
        gap: 40 * scale,
        padding: 40 * scale,
        background: "var(--page)",
        alignItems: "flex-start",
      }}
    >
      {[
        <Frame key="1" headline="Untangle a knot." sub="Drag the beads until no strings cross.">
          <div style={{ width: 1000, height: 1000 }}>
            <CreatureSvg
              creature={HERO}
              pos={tangled}
              state="tangled"
              crossings={crossings(tangled, HERO.edges)}
              eyes="shut"
              r={3}
              sw={1}
              still
            />
          </div>
          <Counter count={tangledCount} />
        </Frame>,

        <Frame key="2" headline="Free a creature." sub="Every solve ends in a reveal.">
          <div style={{ width: 1000, height: 1000 }}>
            <CreatureSvg creature={HERO} state="free" eyes="open" r={3} sw={1} still />
          </div>
          <span style={{ fontSize: 118, fontWeight: 600, color: creatureColor(HERO, "night") }}>
            {HERO.name}
          </span>
        </Frame>,

        <Frame key="3" headline="Grow your pond." sub="Everyone you free lives here.">
          <div
            style={{
              position: "relative",
              width: "100%",
              flex: 1,
              borderRadius: 80,
              background: "var(--water)",
            }}
          >
            {POND.map((creature, k) => {
              const slot = POND_SLOTS[k]!;
              const size = 200 + creature.nodes.length * 6;
              return (
                <div
                  key={creature.id}
                  style={{
                    position: "absolute",
                    left: `${slot[0]}%`,
                    top: `${slot[1]}%`,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
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
                </div>
              );
            })}
          </div>
        </Frame>,

        <Frame
          key="4"
          headline="Your morning ritual."
          sub="One rare knot and your daily G$ claim, side by side."
        >
          {/* The cards are built for a 390pt phone and sized in absolute pixels, so they
              are rendered at that width and scaled up. Retyping them at frame size would
              be a second copy to keep in step with the first. */}
          <div style={{ width: 390 * CARD_SCALE, height: 190 * CARD_SCALE }}>
            <div
              style={{
                width: 390,
                display: "grid",
                gap: 12,
                transform: `scale(${CARD_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <DailyCard solved={false} subtitle="Freed by 1,284 today" onOpen={() => {}} />
              <ClaimCard
                state="ready"
                status={{
                  verified: true,
                  entitlement: 152_370_000_000_000_000_000n,
                  nextClaimAt: null,
                  balance: 0n,
                  decimals: 18,
                }}
                hasWallet
                busy={false}
                onAction={() => {}}
              />
            </div>
          </div>
          <div style={{ width: 460, height: 460, opacity: 0.9 }}>
            <CreatureSvg creature={RARE} state="free" eyes="open" r={5} sw={2.2} still />
          </div>
        </Frame>,
      ].map((frame) => (
        <div
          key={frame.key}
          style={{
            width: WIDTH * scale,
            height: HEIGHT * scale,
            flex: "0 0 auto",
            overflow: "hidden",
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>{frame}</div>
        </div>
      ))}
    </div>
  );
}

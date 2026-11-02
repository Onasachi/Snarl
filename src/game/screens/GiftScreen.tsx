import { useMemo, useState } from "react";
import { creatureById } from "~/data";
import type { Creature } from "~/engine";
import { giftLink } from "~/game/gift";
import { useGame } from "~/game/store";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * Screen 14: give one of your creatures to someone. The whole gift rides in the link's
 * fragment, so there is nothing to sign up for at either end and nothing kept anywhere.
 *
 * The design pairs this with a G$ tip. That part is not built: a link has no address
 * behind it until someone opens it, so a tip needs either the recipient's wallet up front
 * or an escrow contract to hold it. Neither exists yet, and a tip box that quietly did
 * nothing would be worse than no tip box.
 */
export function GiftScreen({
  onBack,
  onToast,
}: {
  onBack: () => void;
  onToast: (m: string) => void;
}) {
  const freed = useGame((s) => s.freed);
  const [chosen, setChosen] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [link, setLink] = useState<string | null>(null);

  // One of each: a pond with four Pips should offer Pip once.
  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: Creature[] = [];
    for (const entry of freed) {
      if (seen.has(entry.id)) continue;
      const creature = creatureById(entry.id);
      if (!creature) continue;
      seen.add(entry.id);
      list.push(creature);
    }
    return list;
  }, [freed]);

  const creature = chosen ? creatureById(chosen) : undefined;

  const make = () => {
    if (!creature) return;
    const origin = `${window.location.origin}${window.location.pathname}`;
    setLink(
      giftLink(origin, {
        id: creature.id,
        at: Date.now(),
        ...(from.trim() ? { from: from.trim() } : {}),
      }),
    );
  };

  const share = async () => {
    if (!link || !creature) return;
    const text = `I freed ${creature.name} for you.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "snarl", text, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      onToast("Link copied. Send it to anyone.");
    } catch {
      // Cancelled, or no permission. The link is on screen either way.
      onToast("The link is on screen — copy it from there.");
    }
  };

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 4px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
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
          Pond
        </button>
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: 0 }}>Gift a Snarl</h2>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "12px 20px", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setChosen(option.id);
                setLink(null);
              }}
              aria-pressed={chosen === option.id}
              style={{
                aspectRatio: "1 / 1",
                padding: 8,
                border: `1px solid ${chosen === option.id ? "var(--ink)" : "var(--card-line)"}`,
                borderRadius: 18,
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              <CreatureSvg creature={option} state="free" eyes="open" r={5} sw={2.2} still />
            </button>
          ))}
        </div>

        {options.length === 0 && (
          <p style={{ fontSize: 17, color: "var(--ink2)", textAlign: "center", marginTop: 40 }}>
            Free a creature first, then you can send one on.
          </p>
        )}

        <label style={{ display: "grid", gap: 6, marginTop: 20 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink2)",
            }}
          >
            From (optional)
          </span>
          <input
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setLink(null);
            }}
            maxLength={24}
            placeholder="Your name"
            style={{
              minHeight: 48,
              padding: "0 14px",
              border: "1px solid var(--card-line)",
              borderRadius: 14,
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "inherit",
              fontSize: 16,
            }}
          />
        </label>

        {link && (
          <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--ink2)", margin: 0 }}>
              Anyone who opens this gets {creature?.name} in their pond. The link holds the whole
              gift, so nothing is stored anywhere.
            </p>
            <code
              style={{
                display: "block",
                padding: 12,
                border: "1px solid var(--card-line)",
                borderRadius: 14,
                background: "var(--card)",
                color: "var(--ink2)",
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              {link}
            </code>
          </div>
        )}
      </main>

      <footer
        data-bottom-stack
        style={{
          position: "relative",
          padding: "12px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={link ? () => void share() : make}
          disabled={!creature}
          style={{
            width: "100%",
            minHeight: 52,
            border: "none",
            borderRadius: 16,
            background: creature ? "var(--ink)" : "var(--card)",
            color: creature ? "var(--bg)" : "var(--ink2)",
            fontSize: 18,
            fontWeight: 500,
            cursor: creature ? "pointer" : "default",
          }}
        >
          {link ? "Send the link" : "Make a link"}
        </button>
      </footer>
    </>
  );
}

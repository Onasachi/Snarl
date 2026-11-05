/**
 * The icon set, drawn in the creatures' own hand.
 *
 * Same language as the knots: a 24-unit box, strokes of 1.8 with round caps and joins,
 * `currentColor` throughout so an icon is whatever colour the text beside it is. Nothing
 * filled, nothing shaded — a creature is beads and string, and so is everything else.
 *
 * Deliberately few. An icon set grows by one every time somebody cannot find a word, and
 * then nothing is recognisable; these are the things the game actually has.
 */
export type IconName =
  | "gift"
  | "person"
  | "board"
  | "shop"
  | "journal"
  | "settings"
  | "copy"
  | "leave"
  | "pond"
  | "knot"
  | "coin"
  | "moon"
  | "chevron"
  | "sound"
  | "mute"
  | "check";

const PATHS: Record<IconName, React.ReactNode> = {
  // A parcel: a box with a ribbon over it.
  gift: (
    <>
      <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M3 8h18v3H3z" />
      <path d="M12 8v12" />
      <path d="M12 8S10.5 4 8.5 4a2 2 0 0 0 0 4zM12 8s1.5-4 3.5-4a2 2 0 0 1 0 4z" />
    </>
  ),
  // A bead with shoulders: the same head every creature has.
  person: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // Three columns, tallest in the middle.
  board: (
    <>
      <path d="M5 20v-6M12 20V5M19 20v-9" />
      <path d="M3 20h18" />
    </>
  ),
  // A basket.
  shop: (
    <>
      <path d="M4 8h16l-1.4 10a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  // A book, open.
  journal: (
    <>
      <path d="M12 6.5S10 4.8 6.6 4.8H4v13h2.6c3.4 0 5.4 1.7 5.4 1.7s2-1.7 5.4-1.7H20v-13h-2.6C14 4.8 12 6.5 12 6.5z" />
      <path d="M12 6.5v13.2" />
    </>
  ),
  // Two sheets, one behind the other.
  // Sliders: the only settings this game has are a handful of choices.
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="10" cy="17" r="2.2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  ),
  // A door with an arrow leaving it.
  leave: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  // Water: two ripples.
  pond: (
    <>
      <path d="M3 10c2.2-2 4.4-2 6.6 0s4.4 2 6.6 0 4.4-2 4.8-.6" />
      <path d="M3 16c2.2-2 4.4-2 6.6 0s4.4 2 6.6 0 4.4-2 4.8-.6" />
    </>
  ),
  // Four beads and the strings between them: snarl in miniature.
  knot: (
    <>
      <path d="M7 7l10 10M17 7L7 17" />
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="7" cy="17" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.2v7.6M14.4 9.6a2.6 2.6 0 0 0-4.6 1.5c0 2.6 4.8 1.4 4.8 3.9A2.6 2.6 0 0 1 9.6 15" />
    </>
  ),
  moon: <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2z" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  sound: (
    <>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5z" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.8a7.5 7.5 0 0 1 0 10.4" />
    </>
  ),
  mute: (
    <>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5z" />
      <path d="M16.5 10l4 4M20.5 10l-4 4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative in every use here: each one sits beside its own word, and an icon that
      // repeats the label is noise to a screen reader.
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

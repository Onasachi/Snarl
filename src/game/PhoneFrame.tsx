import { type CSSProperties, type ReactNode, useEffect } from "react";
import { useGame } from "~/game/store";
import { ThemeProvider } from "~/theme/ThemeProvider";

/**
 * The 390 × 844 phone the design is drawn for. On a real phone it fills the screen; on a
 * desktop it sits in the middle with rounded corners, which is also how the design doc
 * presents every screen.
 */
export function PhoneFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const theme = useGame((s) => s.theme);

  // Also on <html>, so the page behind the phone and the browser's own surfaces follow
  // the palette rather than staying night while the game turns to paper.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div
      data-theme={theme}
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--page)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(390px, 100vw)",
          height: "min(844px, 100dvh)",
          borderRadius: "max(0px, min(44px, calc((100vw - 400px) * 999)))",
          // clip, not hidden: `hidden` still makes a scroll container, and the pond's
          // creatures swim up to 26px past the edge. Focusing a button then scrolls the
          // whole phone sideways by however far they happen to be out.
          overflow: "clip",
          background: "var(--bg)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </div>
    </div>
  );
}

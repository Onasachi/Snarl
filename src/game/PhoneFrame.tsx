import type { CSSProperties, ReactNode } from "react";

/**
 * The 390 × 844 phone the design is drawn for. On a real phone it fills the screen; on a
 * desktop it sits in the middle with rounded corners, which is also how the design doc
 * presents every screen.
 */
export function PhoneFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#05080f",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(390px, 100vw)",
          height: "min(844px, 100dvh)",
          borderRadius: "max(0px, min(44px, calc((100vw - 400px) * 999)))",
          overflow: "hidden",
          background: "var(--bg)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

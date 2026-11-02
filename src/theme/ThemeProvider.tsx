import { createContext, type ReactNode, useContext } from "react";
import type { ThemeId } from "~/data";

const ThemeContext = createContext<ThemeId>("night");

/**
 * Which palette is on. The chrome follows CSS custom properties set by `data-theme`;
 * this is for the drawings, whose colours are computed per creature in oklch and so
 * cannot come from a variable.
 */
export const useThemeId = (): ThemeId => useContext(ThemeContext);

export const ThemeProvider = ({ theme, children }: { theme: ThemeId; children: ReactNode }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

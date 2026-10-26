import { type ReactNode } from "react";
import {
  ThemeProvider as DSThemeProvider,
  portalTheme,
  type DeepPartial,
  type ThemeTokens,
} from "@devs-atem/design-system";

/**
 * Tema Navemazônia — Portal do Cliente de Armazenagem.
 *
 * Identidade derivada do protótipo:
 * - Primária:  #0D265E (azul marinho)
 * - Destaque:  #F39200 (laranja)
 * - Títulos em Montserrat, corpo em Inter.
 */
const NAVY = "#0D265E";
const NAVY_HOVER = "#1A3A7A";
const ORANGE = "#F39200";

const overrides: DeepPartial<ThemeTokens> = {
  colors: {
    "action-primary": NAVY,
    "action-primaryHover": NAVY_HOVER,
    "action-secondary": ORANGE,
    "button-primary": NAVY,
    "button-primary-text": "#FFFFFF",
    "border-focus": ORANGE,
    icon: NAVY,
  },
  typography: {
    "fontFamily-sans":
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    button: "8px",
    card: "12px",
  },
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return (
    <DSThemeProvider theme={portalTheme} overrides={overrides}>
      {children}
    </DSThemeProvider>
  );
};

export default ThemeProvider;

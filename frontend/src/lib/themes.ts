export interface ThemeColors {
  bg: string;
  panelBg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
}

export const THEMES: { name: string; colors: ThemeColors }[] = [
  {
    name: 'Midnight Dark',
    colors: {
      bg: '#0F0F11',
      panelBg: '#18181A',
      cardBg: '#27272A',
      text: '#FAFAFA',
      textMuted: '#A1A1AA',
      border: '#3F3F46',
      accent: '#3B82F6',
      accentText: '#FFFFFF'
    }
  },
  {
    name: 'Daylight',
    colors: {
      // Surfaces step app -> card -> panel. The steps were previously ~1.1:1,
      // so cards vanished into the panels and an unfilled bar read as nothing.
      bg: '#D6DEEA',        // app background — deeper slate, so white panels read as raised
      panelBg: '#FFFFFF',   // panels — crisp white
      cardBg: '#E3EAF3',    // cards & chart tracks — a real step below the white panels
      text: '#0B1220',      // primary text — near-black slate, maximum legibility
      textMuted: '#43506B', // secondary text — slate, holds up on both panel and card
      border: '#A9B6C9',    // borders & bar tracks — defined against white and card alike
      accent: '#1D4ED8',    // blue-700 — deeper, higher-contrast accent on white
      accentText: '#FFFFFF'
    }
  }
];
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
      bg: '#E2E8F0',        // app background — slate-200, frames the white panels with clear separation
      panelBg: '#FFFFFF',   // panels — crisp white
      cardBg: '#EDF1F7',    // cards & chart tracks — light slate, distinct from white panels
      text: '#0B1220',      // primary text — near-black slate, maximum legibility
      textMuted: '#475569', // secondary text — slate-600, far stronger than the old washed-out slate-500
      border: '#B8C2D0',    // borders — slate-300+, clearly defined card edges
      accent: '#1D4ED8',    // blue-700 — deeper, higher-contrast accent on white
      accentText: '#FFFFFF'
    }
  }
];
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
      bg: '#EDF0F4',        // app background — soft slate, sits behind panels
      panelBg: '#FFFFFF',   // panels — crisp white
      cardBg: '#EEF2F7',    // cards & chart tracks — light slate, visible on white
      text: '#0F172A',      // primary text — slate-900, strong but not harsh black
      textMuted: '#64748B', // secondary text — slate-500
      border: '#D2D9E2',    // borders — clearly visible, not washed out
      accent: '#2563EB',    // vibrant blue — fixes the black bars/bubbles
      accentText: '#FFFFFF'
    }
  }
];
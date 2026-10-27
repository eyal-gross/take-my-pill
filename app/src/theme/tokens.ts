export type ThemeName = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentGradient: [string, string];
  accentInk: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  successInk: string;
  alarm: string;
  alarmSoft: string;
  hairline: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  glow: string;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: (n: number) => number;
}

const dark: ThemeColors = {
  background: '#15121D',
  surface: '#1E1A29',
  surfaceRaised: '#28233A',
  textPrimary: '#F5F1F7',
  textSecondary: '#A79FB8',
  textTertiary: '#6E6680',
  accent: '#E88A9A',
  accentGradient: ['#F3B2A4', '#E88A9A'],
  accentInk: '#2A1A22',
  accentSoft: 'rgba(232,138,154,0.16)',
  success: '#9CD2C6',
  successSoft: 'rgba(156,210,198,0.16)',
  successInk: '#12302A',
  alarm: '#F4C98A',
  alarmSoft: 'rgba(244,201,138,0.18)',
  hairline: 'rgba(255,255,255,0.08)',
  danger: '#F09A9A',
  dangerSoft: 'rgba(240,154,154,0.14)',
  overlay: 'rgba(10,8,16,0.6)',
  glow: 'rgba(232,138,154,0.45)',
};

const light: ThemeColors = {
  background: '#F2ECE3',
  surface: '#FFFFFF',
  surfaceRaised: '#EBE4D9',
  textPrimary: '#1E1A29',
  textSecondary: '#6B637A',
  textTertiary: '#A39BB0',
  accent: '#E07A8A',
  accentGradient: ['#F0A392', '#E07A8A'],
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(224,122,138,0.12)',
  success: '#3F9D8A',
  successSoft: 'rgba(63,157,138,0.12)',
  successInk: '#FFFFFF',
  alarm: '#D9A24E',
  alarmSoft: 'rgba(217,162,78,0.16)',
  hairline: 'rgba(30,26,41,0.14)',
  danger: '#D4616B',
  dangerSoft: 'rgba(212,97,107,0.12)',
  overlay: 'rgba(30,26,41,0.35)',
  glow: 'rgba(224,122,138,0.35)',
};

const base = {
  radius: { sm: 12, md: 18, lg: 28, xl: 36, pill: 999 },
  spacing: (n: number) => n * 4,
};

export const themes: Record<ThemeName, Theme> = {
  dark: { name: 'dark', colors: dark, ...base },
  light: { name: 'light', colors: light, ...base },
};

/** Confetti palette, shared by both themes (apricot / rose / sage / cream / lilac). */
export const confettiPalette = ['#F3B2A4', '#E88A9A', '#9CD2C6', '#F6EBDD', '#C9B8E8'];

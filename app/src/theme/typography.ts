import type { Language } from '../i18n/types';

/**
 * Display = Rubik SemiBold for both scripts (Eyal's pick, round-2 review): soft, modern, one voice.
 * Body    = Heebo, which covers both scripts with matching metrics.
 * Keys must match the names passed to useFonts in App.tsx.
 */
export const fontMap = {
  display: 'Rubik_600SemiBold',
  displayMedium: 'Rubik_500Medium',
  body: 'Heebo_400Regular',
  bodyMedium: 'Heebo_500Medium',
  bodySemibold: 'Heebo_600SemiBold',
  bodyBold: 'Heebo_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'displaySmall'
  | 'title'
  | 'body'
  | 'bodyLarge'
  | 'bodyStrong'
  | 'caption'
  | 'captionLarge'
  | 'label'
  | 'labelLarge'
  | 'numeral'
  | 'numeralLarge';

export interface TextStyleSpec {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export function textStyle(variant: TextVariant, _language: Language): TextStyleSpec {
  switch (variant) {
    case 'display':
      return { fontFamily: fontMap.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.3 };
    case 'displaySmall':
      return { fontFamily: fontMap.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.2 };
    case 'title':
      return { fontFamily: fontMap.bodySemibold, fontSize: 20, lineHeight: 26 };
    case 'body':
      return { fontFamily: fontMap.body, fontSize: 17, lineHeight: 24 };
    case 'bodyLarge':
      return { fontFamily: fontMap.body, fontSize: 21, lineHeight: 28 };
    case 'bodyStrong':
      return { fontFamily: fontMap.bodySemibold, fontSize: 17, lineHeight: 24 };
    case 'caption':
      return { fontFamily: fontMap.body, fontSize: 13, lineHeight: 18 };
    case 'captionLarge':
      return { fontFamily: fontMap.body, fontSize: 15, lineHeight: 20 };
    case 'label':
      return { fontFamily: fontMap.bodyMedium, fontSize: 14, lineHeight: 18, letterSpacing: 0.2 };
    case 'labelLarge':
      return { fontFamily: fontMap.bodyMedium, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 };
    case 'numeral':
      return { fontFamily: fontMap.bodyMedium, fontSize: 17, lineHeight: 22 };
    case 'numeralLarge':
      return { fontFamily: fontMap.bodyMedium, fontSize: 21, lineHeight: 28 };
  }
}

/** Display size that follows the screen width (36pt on a 402pt phone, up to 40pt on a Pro Max). */
export function displaySizeFor(width: number): { fontSize: number; lineHeight: number } {
  const fontSize = Math.round(Math.min(40, Math.max(32, width * 0.085)));
  return { fontSize, lineHeight: Math.round(fontSize * 1.15) };
}

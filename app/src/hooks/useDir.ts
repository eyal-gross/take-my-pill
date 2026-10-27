import { useMemo } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { useLanguage } from '../i18n';

/**
 * Manual direction handling. We deliberately do NOT use I18nManager.forceRTL, which needs an
 * app reload to take effect. Rows and text alignment flip from these helpers instead, so a
 * language switch is instant.
 */
export function useDir() {
  const language = useLanguage();
  const isRTL = language === 'he';
  return useMemo(
    () => ({
      isRTL,
      row: { flexDirection: isRTL ? 'row-reverse' : 'row' } as ViewStyle,
      textAlign: (isRTL ? 'right' : 'left') as TextStyle['textAlign'],
      writingDirection: (isRTL ? 'rtl' : 'ltr') as TextStyle['writingDirection'],
      /** Logical "start" side as a physical side name, for margins/absolute positioning. */
      start: isRTL ? ('right' as const) : ('left' as const),
      end: isRTL ? ('left' as const) : ('right' as const),
    }),
    [isRTL],
  );
}

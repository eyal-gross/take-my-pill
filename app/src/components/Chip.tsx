import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

type Tone = 'accent' | 'success' | 'alarm' | 'neutral';

interface Props {
  label: string;
  onPress?: () => void;
  active?: boolean;
  tone?: Tone;
  /** Small leading dot in the tone color. */
  dot?: boolean;
  /** Larger chip for the big settings UI. */
  large?: boolean;
  /** Outlined accent, full-height action chip (Home's "Quiet time"). */
  outlined?: boolean;
  style?: ViewStyle;
  /** Rendered before the label, e.g. playing bars. */
  leading?: React.ReactNode;
}

export function Chip({ label, onPress, active = false, tone = 'accent', dot = false, large = false, outlined = false, style, leading }: Props) {
  const theme = useTheme();
  const dir = useDir();
  const c = theme.colors;
  const toneColor = tone === 'accent' ? c.accent : tone === 'success' ? c.success : tone === 'alarm' ? c.alarm : c.textSecondary;
  const toneSoft = tone === 'accent' ? c.accentSoft : tone === 'success' ? c.successSoft : tone === 'alarm' ? c.alarmSoft : c.surfaceRaised;

  const background = outlined ? (active ? toneSoft : 'transparent') : active ? toneSoft : c.surfaceRaised;
  const border = outlined || active ? toneColor : 'transparent';
  const textColor = outlined || active ? toneColor : c.textSecondary;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptics.select();
              onPress();
            }
          : undefined
      }
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        large && styles.large,
        outlined && styles.outlined,
        dir.row,
        { borderRadius: theme.radius.pill, backgroundColor: background, borderColor: border, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: toneColor }]} />}
      {leading}
      <AppText variant={large || outlined ? 'bodyStrong' : 'label'} color={textColor}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  large: { minHeight: 52, paddingHorizontal: 22, paddingVertical: 12 },
  outlined: { minHeight: 56, paddingHorizontal: 24, borderWidth: 1.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

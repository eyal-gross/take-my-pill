import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

export type UiSize = 'md' | 'lg';

export function Card({ children, style, size = 'md' }: { children: React.ReactNode; style?: ViewStyle; size?: UiSize }) {
  const theme = useTheme();
  const lg = size === 'lg';
  return (
    <View
      style={[
        styles.card,
        lg && styles.cardLg,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: lg ? theme.radius.xl : theme.radius.lg,
          // Light mode: white cards on a cream background need an outline to read as blocks.
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.name === 'light' ? theme.colors.hairline : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, size = 'md' }: { children: string; size?: UiSize }) {
  const theme = useTheme();
  return (
    <AppText variant={size === 'lg' ? 'labelLarge' : 'label'} color={theme.colors.textTertiary} style={size === 'lg' ? styles.sectionLg : styles.section}>
      {children.toUpperCase()}
    </AppText>
  );
}

interface RowProps {
  label: string;
  value?: string;
  hint?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
  size?: UiSize;
}

/** A settings row: label on the start side, value / control on the end side. */
export function Row({ label, value, hint, right, onPress, last = false, destructive = false, size = 'md' }: RowProps) {
  const theme = useTheme();
  const dir = useDir();
  const lg = size === 'lg';
  const body = (
    <>
      <View style={[styles.rowInner, dir.row]}>
        <AppText variant={lg ? 'bodyLarge' : 'body'} color={destructive ? theme.colors.danger : theme.colors.textPrimary} style={styles.rowLabel}>
          {label}
        </AppText>
        {value !== undefined && (
          <AppText variant={lg ? 'numeralLarge' : 'numeral'} color={theme.colors.textSecondary}>
            {value}
          </AppText>
        )}
        {right}
      </View>
      {hint && (
        <AppText variant={lg ? 'captionLarge' : 'caption'} color={theme.colors.textTertiary} style={styles.hint}>
          {hint}
        </AppText>
      )}
    </>
  );
  const border = last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline };
  const pad = lg ? styles.rowLg : styles.row;
  if (!onPress) return <View style={[pad, border]}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [pad, border, { opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 20, paddingVertical: 4, marginBottom: 20 },
  cardLg: { paddingHorizontal: 24, paddingVertical: 6, marginBottom: 32 },
  section: { marginBottom: 10, marginHorizontal: 4 },
  sectionLg: { marginBottom: 14, marginHorizontal: 4 },
  row: { paddingVertical: 14 },
  rowLg: { paddingVertical: 24 },
  rowInner: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1 },
  hint: { marginTop: 6 },
});

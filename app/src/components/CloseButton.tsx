import { Canvas, Path } from '@shopify/react-native-skia';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useT } from '../i18n';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

interface Props {
  onPress: () => void;
  /** 'x' dismisses a sheet; 'check' confirms and closes (settings). */
  icon?: 'x' | 'check';
  /** Screen title, rendered on the start side of the same row as the button. */
  title?: string;
  /** Inside a pinned Screen header: the bar provides the spacing. */
  pinned?: boolean;
}

/**
 * Header row: title on the start side, one circular 44pt button on the end side. Lives in normal
 * flow inside the Screen's safe-area padding, never absolute, so it is always reachable.
 */
export function SheetHeader({ onPress, icon = 'x', title, pinned = false }: Props) {
  const theme = useTheme();
  const dir = useDir();
  const t = useT();
  const c = theme.colors;
  const isCheck = icon === 'check';
  return (
    <View style={[styles.header, pinned && styles.pinned, dir.row]}>
      {title ? (
        <AppText variant="display" style={styles.title}>
          {title}
        </AppText>
      ) : (
        <View style={styles.title} />
      )}
      <Pressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isCheck ? t('common.done') : t('common.close')}
        style={({ pressed }) => [styles.btn, { backgroundColor: isCheck ? c.accentSoft : c.surfaceRaised, opacity: pressed ? 0.6 : 1 }]}
      >
        <View pointerEvents="none" style={styles.iconWrap}>
          {isCheck ? (
            <Canvas style={{ width: 22, height: 22 }}>
              <Path path="M 4 11.5 L 9 16.5 L 18.5 6" style="stroke" strokeWidth={2.6} strokeCap="round" strokeJoin="round" color={c.accent} />
            </Canvas>
          ) : (
            <>
              <View style={[styles.bar, { backgroundColor: c.textSecondary, transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.bar, { backgroundColor: c.textSecondary, transform: [{ rotate: '-45deg' }] }]} />
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 28 },
  pinned: { marginBottom: 0 },
  title: { flex: 1 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: 16, height: 2, borderRadius: 1 },
});

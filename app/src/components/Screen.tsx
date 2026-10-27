import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** Extra bottom padding, e.g. above a sticky footer. */
  bottomInset?: number;
  /**
   * Pinned header (scroll screens only). Stays at the top while the content scrolls under it.
   * Content fades out just below the bar, like iOS 26's soft scroll-edge effect.
   */
  header?: React.ReactNode;
}

const FADE = 28;

export function Screen({ children, scroll = false, style, bottomInset = 0, header }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [headerH, setHeaderH] = useState(0);
  const bg = theme.colors.background;
  const padding = {
    paddingTop: insets.top + theme.spacing(3),
    paddingBottom: insets.bottom + theme.spacing(4) + bottomInset,
    paddingHorizontal: theme.spacing(5),
  };
  if (scroll && header) {
    return (
      <View style={[styles.fill, { backgroundColor: bg }]}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[padding, { paddingTop: headerH + theme.spacing(2) }, style]}
          scrollIndicatorInsets={{ top: headerH }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        <View style={styles.bar} pointerEvents="box-none" onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
          <View
            style={{
              backgroundColor: bg,
              paddingTop: insets.top + theme.spacing(3),
              paddingHorizontal: theme.spacing(5),
              paddingBottom: theme.spacing(2),
            }}
          >
            {header}
          </View>
          <LinearGradient pointerEvents="none" colors={[bg, `${bg}00`]} style={styles.fade} />
        </View>
      </View>
    );
  }
  if (scroll) {
    return (
      <ScrollView
        style={[styles.fill, { backgroundColor: bg }]}
        contentContainerStyle={[padding, style]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: bg }, padding, style]}>
      {header}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Hangs below the bar and is not part of its measured height, so content starts right under the solid part.
  fade: { position: 'absolute', left: 0, right: 0, bottom: -FADE, height: FADE },
});

import React, { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { haptics } from '../hooks/useHaptics';

/**
 * Hebrew swipe-back. The page slides in from the left in Hebrew, but iOS's own back swipe always
 * starts at the left edge, which feels backwards. This strip on the right edge closes the screen
 * with a leftward swipe instead (the native gesture is turned off for Hebrew in RootNavigator).
 */
export function EdgeSwipeBack({ onBack }: { onBack: () => void }) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60 || g.vx < -0.5) {
            haptics.light();
            onBack();
          }
        },
      }),
    [onBack],
  );
  return <View style={styles.strip} {...responder.panHandlers} />;
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 28 },
});

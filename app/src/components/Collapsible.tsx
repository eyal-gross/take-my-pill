import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface Props {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
}

const EASE = Easing.bezier(0.3, 0.0, 0.2, 1);

/**
 * Smooth accordion body: measures its content once, then animates height + opacity.
 * Content stays mounted so the measurement is stable and reopening is instant.
 */
export function Collapsible({ open, children, duration = 320 }: Props) {
  const measured = useSharedValue(0);
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration, easing: EASE });
  }, [open, duration, progress]);

  const outer = useAnimatedStyle(() => ({
    height: measured.value * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[styles.outer, outer]} pointerEvents={open ? 'auto' : 'none'}>
      <View
        style={styles.inner}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - measured.value) > 0.5) measured.value = h;
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { overflow: 'hidden' },
  inner: { position: 'absolute', left: 0, right: 0, top: 0 },
});

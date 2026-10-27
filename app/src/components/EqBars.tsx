import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

function Bar({ color, delay }: { color: string; delay: number }) {
  const h = useSharedValue(4);
  useEffect(() => {
    h.value = withDelay(delay, withRepeat(withTiming(16, { duration: 450, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(h);
  }, [delay, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/** Three bouncing bars: "this sound is playing". */
export function EqBars({ color }: { color: string }) {
  return (
    <View style={styles.wrap}>
      <Bar color={color} delay={0} />
      <Bar color={color} delay={150} />
      <Bar color={color} delay={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 },
  bar: { width: 3, borderRadius: 2 },
});

import { Canvas, Path } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fontMap } from '../theme/typography';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

/** Hero size follows the screen: 72% of the width, between 260 and 330pt. */
export function useTookItSize(): number {
  const { width } = useWindowDimensions();
  return Math.round(Math.min(330, Math.max(260, width * 0.72)));
}

interface Props {
  taken: boolean;
  /** A slot is due or imminent → gentle breathing to invite the tap. */
  due: boolean;
  label: string;
  subLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}

const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };

export function TookItButton({ taken, due, label, subLabel, onPress, disabled = false }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const size = useTookItSize();
  const { width } = useWindowDimensions();
  const labelSize = Math.round(width * 0.095);

  const press = useSharedValue(1);
  const breathe = useSharedValue(1);
  const check = useSharedValue(taken ? 1 : 0);
  const takenMix = useSharedValue(taken ? 1 : 0);

  useEffect(() => {
    if (due && !taken) {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(breathe);
      breathe.value = withTiming(1, { duration: 300 });
    }
  }, [due, taken, breathe]);

  useEffect(() => {
    takenMix.value = withTiming(taken ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
    check.value = taken
      ? withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }))
      : withTiming(0, { duration: 200 });
  }, [taken, takenMix, check]);

  const outer = useAnimatedStyle(() => ({ transform: [{ scale: press.value * breathe.value }] }));
  const gradientStyle = useAnimatedStyle(() => ({ opacity: 1 - takenMix.value }));
  const successStyle = useAnimatedStyle(() => ({ opacity: takenMix.value }));

  const circle = { width: size, height: size, borderRadius: size / 2 };
  const glowSize = size - 24;
  const checkSize = Math.round(size * 0.42);

  return (
    <Animated.View style={[outer, styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            shadowColor: taken ? c.success : c.accent,
            backgroundColor: taken ? c.success : c.accent,
          },
        ]}
      />
      <Pressable
        disabled={disabled || taken}
        onPressIn={() => {
          press.value = withSpring(0.96, SPRING);
        }}
        onPressOut={() => {
          press.value = withSpring(1, SPRING);
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[circle, styles.clip, { opacity: disabled && !taken ? 0.55 : 1 }]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
          <LinearGradient colors={c.accentGradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, circle]} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, circle, successStyle, { backgroundColor: c.success }]} />

        <View style={styles.content} pointerEvents="none">
          {taken ? (
            <Canvas style={{ width: checkSize, height: checkSize }}>
              <Path
                path="M 22 50 L 42 70 L 76 30"
                style="stroke"
                strokeWidth={8}
                strokeCap="round"
                strokeJoin="round"
                color={c.successInk}
                start={0}
                end={check}
                transform={[{ scale: checkSize / 96 }]}
              />
            </Canvas>
          ) : (
            <AppText
              variant="displaySmall"
              color={c.accentInk}
              align="center"
              style={{ fontFamily: fontMap.display, fontSize: labelSize, lineHeight: Math.round(labelSize * 1.1) }}
            >
              {label}
            </AppText>
          )}
          {subLabel && (
            <AppText variant="label" color={taken ? c.successInk : c.accentInk} align="center" style={{ opacity: 0.85 }}>
              {subLabel}
            </AppText>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', shadowOpacity: 0.55, shadowRadius: 40, shadowOffset: { width: 0, height: 14 } },
  clip: { overflow: 'hidden' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
});

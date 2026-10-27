import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

const SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const textColor =
    variant === 'primary' ? theme.colors.accentInk : variant === 'secondary' ? theme.colors.textPrimary : theme.colors.accent;

  const inner = (
    <AppText variant="bodyStrong" color={textColor} align="center">
      {label}
    </AppText>
  );

  return (
    <Animated.View style={[animated, { opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        accessibilityRole="button"
        style={[
          styles.base,
          { borderRadius: theme.radius.pill },
          variant === 'secondary' && { backgroundColor: theme.colors.surfaceRaised },
          variant === 'ghost' && { backgroundColor: 'transparent' },
        ]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={theme.colors.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fill, { borderRadius: theme.radius.pill }]}
          >
            {inner}
          </LinearGradient>
        ) : (
          <Animated.View style={styles.fill}>{inner}</Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', minHeight: 56 },
  fill: { flex: 1, minHeight: 56, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
});

import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined),
  select: () => Haptics.selectionAsync().catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};

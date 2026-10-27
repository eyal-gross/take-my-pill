import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../theme/useTheme';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app replacement for the system alert: title + two buttons, styled like an iOS 26 alert.
 * The system alert can't align a Hebrew title to the right while the app runs left-to-right,
 * so this one follows the app's language direction.
 */
export function ConfirmDialog({ visible, title, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const theme = useTheme();
  const dir = useDir();
  const c = theme.colors;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: c.surfaceRaised }]} onPress={() => undefined}>
          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>
          <View style={[styles.buttons, dir.row]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.light();
                onCancel();
              }}
              style={({ pressed }) => [styles.btn, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
            >
              <AppText variant="bodyStrong" align="center">
                {cancelLabel}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.select();
                onConfirm();
              }}
              style={({ pressed }) => [styles.btn, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
            >
              <AppText variant="bodyStrong" color={c.accentInk} align="center">
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, borderRadius: 32, padding: 22, gap: 20 },
  title: { paddingHorizontal: 4 },
  buttons: { gap: 10 },
  btn: { flex: 1, minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});

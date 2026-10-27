import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PencilIcon, TrashIcon } from '../components/LineIcons';
import { SheetHeader } from '../components/CloseButton';
import { Screen } from '../components/Screen';
import { dateFromKey } from '../engine/cycle';
import { quietWindow } from '../engine/schedule';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { formatDate, formatTime, useT } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';

/** Sheet opened from Home: existing quiet times with edit / delete, plus add. */
export function QuietTimesScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const t = useT();
  const dir = useDir();
  const navigation = useNavigation();
  const quietTimes = useAppStore((s) => s.quietTimes);
  const removeQuietTime = useAppStore((s) => s.removeQuietTime);
  const language = useAppStore((s) => s.language);

  // soonest first
  const sorted = [...quietTimes].sort((a, b) => quietWindow(a).start.getTime() - quietWindow(b).start.getTime());

  return (
    <Screen>
      <SheetHeader title={t('quiet.listTitle')} onPress={() => navigation.goBack()} />
      <AppText variant="body" color={c.textSecondary} style={{ marginBottom: 28 }}>
        {t('quiet.hint')}
      </AppText>

      {sorted.length === 0 ? (
        <AppText variant="body" color={c.textTertiary} style={{ marginBottom: 20 }}>
          {t('quiet.empty')}
        </AppText>
      ) : (
        <Card>
          {sorted.map((q, i) => {
            const w = quietWindow(q);
            const last = i === sorted.length - 1;
            return (
              <View
                key={q.id}
                style={[styles.item, dir.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.hairline }]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="body">{formatDate(dateFromKey(q.dateKey), language)}</AppText>
                  <AppText variant="numeral" color={c.textSecondary}>
                    {`${formatTime(w.start, language)} – ${formatTime(w.end, language)}`}
                  </AppText>
                </View>
                <View style={[dir.row, { gap: 12 }]}>
                  <Pressable
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.edit')}
                    onPress={() => {
                      haptics.select();
                      navigation.navigate('QuietTime', { id: q.id });
                    }}
                    style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.accentSoft, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <PencilIcon color={c.accent} />
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    onPress={() => {
                      haptics.light();
                      removeQuietTime(q.id);
                    }}
                    style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.dangerSoft, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <TrashIcon color={c.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <View style={{ flex: 1 }} />
      <Button label={t('quiet.add')} onPress={() => navigation.navigate('QuietTime', {})} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 16, alignItems: 'center', gap: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

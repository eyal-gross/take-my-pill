import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card, Row } from '../components/Card';
import { SheetHeader } from '../components/CloseButton';
import { Collapsible } from '../components/Collapsible';
import { Screen } from '../components/Screen';
import { TimePickerRow } from '../components/TimePickerRow';
import { dateFromKey, dateKeyOf, timeOfDayToMinutes } from '../engine/cycle';
import type { TimeOfDay } from '../engine/types';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { formatDate, useT } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/useTheme';

type Picker = 'date' | 'from' | 'to' | null;

/**
 * Add / edit one quiet time. The three pickers behave as an accordion: tapping one opens it and
 * closes the other, animated, so nothing ever lands below the fold.
 */
export function QuietTimeScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const t = useT();
  const dir = useDir();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'QuietTime'>>();
  const editingId = route.params?.id;

  const language = useAppStore((s) => s.language);
  const existing = useAppStore((s) => s.quietTimes.find((q) => q.id === editingId));
  const addQuietTime = useAppStore((s) => s.addQuietTime);
  const updateQuietTime = useAppStore((s) => s.updateQuietTime);

  const [date, setDate] = useState(() => (existing ? dateFromKey(existing.dateKey) : new Date()));
  const [from, setFrom] = useState<TimeOfDay>(existing?.from ?? { h: 22, m: 0 });
  const [to, setTo] = useState<TimeOfDay>(existing?.to ?? { h: 23, m: 0 });
  const [open, setOpen] = useState<Picker>('from');

  const toggle = (p: Picker) => {
    haptics.select();
    setOpen((cur) => (cur === p ? null : p));
  };

  const crosses = useMemo(() => timeOfDayToMinutes(to) <= timeOfDayToMinutes(from), [from, to]);

  const save = () => {
    const payload = { dateKey: dateKeyOf(date), from, to };
    if (existing) updateQuietTime(existing.id, payload);
    else addQuietTime(payload);
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <SheetHeader title={t('quiet.title')} onPress={() => navigation.goBack()} />

      <Card>
        <Row label={t('quiet.date')} value={formatDate(date, language)} onPress={() => toggle('date')} />
        <Collapsible open={open === 'date'}>
          <View style={{ alignItems: 'center', paddingBottom: 8 }}>
            <DateTimePicker
              value={date}
              mode="date"
              display="inline"
              minimumDate={new Date()}
              locale={language === 'he' ? 'he-IL' : 'en-GB'}
              themeVariant={theme.name}
              accentColor={c.accent}
              onChange={(_, d) => d && setDate(d)}
            />
          </View>
        </Collapsible>
        <TimePickerRow label={t('quiet.from')} value={from} onChange={setFrom} expanded={open === 'from'} onToggle={() => toggle('from')} />
        <TimePickerRow label={t('quiet.to')} value={to} onChange={setTo} expanded={open === 'to'} onToggle={() => toggle('to')} last />
      </Card>

      <AppText variant="caption" color={c.textTertiary} align="center" style={{ marginBottom: 12, opacity: crosses ? 1 : 0 }}>
        {t('quiet.crossesMidnight')}
      </AppText>

      <View style={[dir.row, styles.footer]}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
        <Button label={t('common.save')} onPress={save} style={{ flex: 2 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 12, marginTop: 8 },
});

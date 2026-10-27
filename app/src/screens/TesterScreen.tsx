import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card, Row, SectionTitle } from '../components/Card';
import { SheetHeader } from '../components/CloseButton';
import { Screen } from '../components/Screen';
import { MINUTE } from '../engine/cycle';
import { isTesterActive } from '../engine/schedule';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { useT } from '../i18n';
import { Alarms } from '../services/alarms';
import { Banners } from '../services/banners';
import { reconcile } from '../services/reconcile';
import { useAppStore } from '../store/useAppStore';
import { textStyle } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

// Hidden tester screen. Not a security boundary, just keeps the compressed test schedule away from curious taps.
const PASSWORD = '0000';

export function TesterScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const t = useT();
  const dir = useDir();
  const navigation = useNavigation();
  const s = useAppStore();
  const now = useNow(5_000);

  const [pw, setPw] = useState('');
  const [wrong, setWrong] = useState(false);
  const [counts, setCounts] = useState({ alarms: 0, banners: 0 });

  const active = isTesterActive({ now, testerFrom: s.testerFrom, testerUntil: s.testerUntil });
  const remaining = active ? Math.max(0, Math.ceil((s.testerUntil! - now.getTime()) / MINUTE)) : 0;

  useEffect(() => {
    if (!s.testerUnlocked) return;
    let cancelled = false;
    Promise.all([Alarms.listScheduled(), Banners.listScheduledIds()]).then(([a, b]) => {
      if (!cancelled) setCounts({ alarms: a.length, banners: b.length });
    });
    return () => {
      cancelled = true;
    };
  }, [now, s.testerUnlocked, s.testerFrom]);

  const submit = () => {
    if (pw === PASSWORD) {
      haptics.success();
      s.unlockTester();
    } else {
      haptics.error();
      setWrong(true);
      setPw('');
    }
  };

  const startFresh = () => {
    Alert.alert(t('tester.resetConfirmTitle'), t('tester.resetConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tester.reset'),
        style: 'destructive',
        onPress: async () => {
          await Alarms.cancelAll().catch(() => undefined);
          await Banners.cancelAll().catch(() => undefined);
          await Banners.clearDelivered().catch(() => undefined);
          s.resetAll();
          // onboarded=false swaps the navigator to Onboarding on its own
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <SheetHeader title={t('tester.title')} onPress={() => navigation.goBack()} />

      {!s.testerUnlocked ? (
        <>
          <Card>
            <TextInput
              value={pw}
              onChangeText={(v) => {
                setPw(v);
                setWrong(false);
              }}
              placeholder={t('tester.password')}
              placeholderTextColor={c.textTertiary}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              maxLength={8}
              onSubmitEditing={submit}
              style={[styles.input, textStyle('title', s.language), { color: c.textPrimary, textAlign: 'center' }]}
            />
          </Card>
          {wrong && (
            <AppText variant="caption" color={c.danger} align="center" style={{ marginBottom: 12 }}>
              {t('tester.wrong')}
            </AppText>
          )}
          <View style={[dir.row, { gap: 12 }]}>
            <Button label={t('common.cancel')} variant="ghost" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
            <Button label={t('tester.enter')} onPress={submit} style={{ flex: 2 }} />
          </View>
        </>
      ) : (
        <>
          <Card>
            <Row
              label={t('tester.toggle')}
              hint={t('tester.hint')}
              value={active ? t('tester.remaining', { min: remaining }) : undefined}
              last
              right={
                <Switch
                  value={active}
                  onValueChange={(v) => {
                    haptics.medium();
                    s.setTesterMode(v, new Date());
                  }}
                  trackColor={{ true: c.alarm, false: c.surfaceRaised }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </Card>

          <SectionTitle>Debug</SectionTitle>
          <Card>
            <Row label={t('tester.scheduled', { alarms: counts.alarms, banners: counts.banners })} />
            <Row label={t('tester.alarmAuth', { state: Alarms.available() ? Alarms.authorizationState() : 'unavailable' })} />
            <Row label={`Alarms by state: ${summarizeStates(Alarms.listAlarmStates())}`} />
            <Row label={`Skipped by snooze: ${Alarms.listSkipped().size}`} />
            <Row label={`Snooze until: ${s.snoozeUntil ? new Date(s.snoozeUntil).toLocaleTimeString() : '-'}`} />
            <Row label="Reconcile now" onPress={() => reconcile()} />
            <Row label="Request alarm permission" onPress={() => Alarms.requestAuthorization()} last />
          </Card>

          <SectionTitle>Alarm button log (newest first)</SectionTitle>
          <Card>
            {s.alarmLog.length === 0 ? (
              <Row label="No button taps recorded yet" last />
            ) : (
              s.alarmLog.slice(0, 10).map((e, i, arr) => (
                <Row key={`${e.at}-${i}`} label={`${new Date(e.at).toLocaleTimeString()}  ${e.action}`} value={e.alarmId.slice(0, 8)} last={i === arr.length - 1} />
              ))
            )}
          </Card>

          <Card>
            <Row label={t('tester.reset')} onPress={startFresh} destructive last />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { paddingVertical: 18, letterSpacing: 6 },
});

function summarizeStates(states: Map<string, string>): string {
  const counts: Record<string, number> = {};
  for (const st of states.values()) counts[st] = (counts[st] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, v]) => `${k} ${v}`);
  return parts.length ? parts.join(', ') : 'none';
}

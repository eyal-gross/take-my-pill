import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../components/AppText';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Confetti, type ConfettiHandle } from '../components/Confetti';
import { GearIcon } from '../components/GearIcon';
import { Screen } from '../components/Screen';
import { TookItButton, useTookItSize } from '../components/TookItButton';
import { atTime, cycleKeyFor, MINUTE } from '../engine/cycle';
import { buildSlots, isTesterActive, quietWindow } from '../engine/schedule';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { formatTime, formatTimeOfDay, useT } from '../i18n';
import { Alarms } from '../services/alarms';
import { Banners } from '../services/banners';
import { useAppStore } from '../store/useAppStore';
import { displaySizeFor } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

export function HomeScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const t = useT();
  const dir = useDir();
  const navigation = useNavigation();
  const now = useNow(15_000);
  const s = useAppStore();
  const { width } = useWindowDimensions();
  const heroSize = useTookItSize();
  const confetti = useRef<ConfettiHandle>(null);
  const buttonRef = useRef<View>(null);
  const [buttonCenter, setButtonCenter] = useState({ x: 0, y: 0 });

  const todayKey = cycleKeyFor(now);
  const taken = s.takenOn === todayKey;
  const testerOn = isTesterActive({ now, testerFrom: s.testerFrom, testerUntil: s.testerUntil });

  const slots = useMemo(
    () =>
      buildSlots({
        now,
        notifStart: s.notifStart,
        alarmStart: s.alarmStart,
        paused: s.paused,
        takenOn: s.takenOn,
        quietTimes: s.quietTimes,
        testerFrom: s.testerFrom,
        testerUntil: s.testerUntil,
      }),
    [now, s.notifStart, s.alarmStart, s.paused, s.takenOn, s.quietTimes, s.testerFrom, s.testerUntil],
  );

  const next = slots[0] ?? null;
  const activeQuiet = s.quietTimes.map(quietWindow).find((w) => now >= w.start && now < w.end);
  const cycleStarted = now >= atTime(todayKey, s.notifStart);
  const due = !taken && !s.paused && cycleStarted && !!next && next.fireAt.getTime() - now.getTime() < 10 * MINUTE;

  const alarmsAllowed = !Alarms.available() || Alarms.authorizationState() === 'authorized';

  const hour = now.getHours();
  const greetingKey =
    hour >= 5 && hour < 12
      ? 'home.greetingMorning'
      : hour >= 12 && hour < 17
        ? 'home.greetingAfternoon'
        : hour >= 17 && hour < 22
          ? 'home.greetingEvening'
          : 'home.greetingNight';

  let status: string;
  let statusTone = c.textSecondary;
  const snoozeActive = !taken && s.snoozeUntil !== null && s.snoozeUntil > now.getTime();
  if (snoozeActive) {
    status = t('home.snoozed', { time: formatTime(new Date(s.snoozeUntil!), s.language) });
    statusTone = c.alarm;
  } else if (testerOn) {
    status = t('home.testerActive', { min: Math.max(0, Math.ceil((s.testerUntil! - now.getTime()) / MINUTE)) });
    statusTone = c.alarm;
  } else if (taken) {
    status = t('home.allDone');
    statusTone = c.success;
  } else if (s.paused) {
    status = t('home.paused');
  } else if (activeQuiet) {
    status = t('home.quietNow', { time: formatTime(activeQuiet.end, s.language) });
  } else if (!cycleStarted) {
    status = t('home.startsAt', { time: formatTimeOfDay(s.notifStart.h, s.notifStart.m) });
  } else if (next && next.cycleKey === todayKey) {
    status = t(next.kind === 'alarm' ? 'home.nextAlarm' : 'home.nextReminder', { time: formatTime(next.fireAt, s.language) });
    statusTone = next.kind === 'alarm' ? c.alarm : c.textSecondary;
  } else {
    status = t('home.allDone');
  }

  const onTookIt = () => {
    haptics.success();
    confetti.current?.fire(buttonCenter);
    s.markTaken(new Date());
    Banners.clearDelivered().catch(() => undefined);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {!alarmsAllowed && (
          <Card style={{ backgroundColor: c.alarmSoft }}>
            <View style={{ paddingVertical: 10, gap: 4 }}>
              <AppText variant="bodyStrong" color={c.alarm}>
                {t('home.alarmsOff')}
              </AppText>
              <AppText variant="caption" color={c.textSecondary}>
                {t('home.alarmsOffHint')}
              </AppText>
              <Chip label={t('home.openSettings')} tone="alarm" active onPress={() => Linking.openSettings()} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
            </View>
          </Card>
        )}

        {/* greeting + hero travel together as one centered group, so on tall screens they stay close */}
        <View style={styles.center}>
          <View style={styles.header}>
            <AppText variant="display" align="center" style={displaySizeFor(width)}>
              {t(greetingKey, { name: s.name })}
            </AppText>
            <AppText variant="body" color={statusTone} align="center" style={{ marginTop: 8 }}>
              {status}
            </AppText>
          </View>
          <View
            ref={buttonRef}
            onLayout={() => {
              // Confetti is drawn on a window-sized canvas, so the origin must be in window coordinates.
              buttonRef.current?.measureInWindow((x, y, w, h) => setButtonCenter({ x: x + w / 2, y: y + h / 2 }));
            }}
            style={{ width: heroSize, height: heroSize }}
          >
            <TookItButton
              taken={taken}
              due={due}
              label={t('home.tookIt')}
              subLabel={taken && s.takenAt ? t('home.takenAt', { time: formatTime(new Date(s.takenAt), s.language) }) : undefined}
              onPress={onTookIt}
              disabled={s.paused && !testerOn}
            />
          </View>
        </View>

        <View style={[styles.bar, dir.row]}>
          <Chip label={t('home.quietTime')} outlined active={!!activeQuiet} onPress={() => navigation.navigate('QuietTimes')} style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              haptics.select();
              navigation.navigate('Settings');
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            style={({ pressed }) => [styles.gear, { backgroundColor: c.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}
          >
            <GearIcon size={24} color={c.textSecondary} />
          </Pressable>
        </View>
      </Screen>
      <Confetti ref={confetti} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 84, alignItems: 'center', paddingHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: { gap: 12, alignItems: 'center', paddingTop: 8 },
  gear: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});

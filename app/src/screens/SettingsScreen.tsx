import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Card, Row, SectionTitle } from '../components/Card';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EdgeSwipeBack } from '../components/EdgeSwipeBack';
import { EqBars } from '../components/EqBars';
import { SheetHeader } from '../components/CloseButton';
import { Screen } from '../components/Screen';
import { NumberWheelRow } from '../components/NumberWheelRow';
import { TimePickerRow } from '../components/TimePickerRow';
import { cycleKeyFor, isValidSchedule } from '../engine/cycle';
import { ringNormalPreview } from '../services/previewAlarm';
import { playPreview, stopPreview } from '../services/soundPreview';
import { useDir } from '../hooks/useDir';
import { haptics } from '../hooks/useHaptics';
import { useT, type Language } from '../i18n';
import { useAppStore, type SoundChoice } from '../store/useAppStore';
import { textStyle } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

/** Deliberately large: three to four fields per screen (round-2 review). */
export function SettingsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const t = useT();
  const dir = useDir();
  const navigation = useNavigation();
  const s = useAppStore();
  const [name, setName] = useState(s.name);
  const [openPicker, setOpenPicker] = useState<'notif' | 'alarm' | 'snooze' | null>(null);
  // Which sound is "playing" its 15-second preview. The audio player arrives with the next build;
  // until then the bars run without sound so the design matches the final look.
  const [playing, setPlaying] = useState<SoundChoice | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [askNormal, setAskNormal] = useState(false);
  // iOS takes ~2-3s to bring up a real alarm. Show that it's coming so the gap isn't dead air.
  const [ringingSoon, setRingingSoon] = useState(false);
  useEffect(() => {
    if (!ringingSoon) return;
    const done = () => {
      setRingingSoon(false);
      setPlaying((p) => (p === 'classic' ? null : p));
    };
    const timer = setTimeout(done, 6000);
    // The alarm screen taking over pulls the app out of 'active'.
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && done());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [ringingSoon]);
  useEffect(
    () => () => {
      if (playTimer.current) clearTimeout(playTimer.current);
      stopPreview();
    },
    [],
  );
  const tapSound = (snd: SoundChoice) => {
    if (playTimer.current) clearTimeout(playTimer.current);
    stopPreview();
    setRingingSoon(false);
    s.setSound(snd);
    // Normal is the iPhone's own alarm: iOS only plays it as a real alarm, so offer a test alarm.
    if (snd === 'classic') {
      setPlaying(null);
      setAskNormal(true);
      return;
    }
    if (playing === snd) {
      setPlaying(null);
      return;
    }
    setPlaying(snd);
    // Real audio on builds with the player; on older builds the bars run alone for the same 15s.
    const ended = () => setPlaying((p) => (p === snd ? null : p));
    playPreview(snd, ended);
    playTimer.current = setTimeout(ended, 16000);
  };
  const togglePicker = (p: 'notif' | 'alarm' | 'snooze') => {
    haptics.select();
    setOpenPicker((cur) => (cur === p ? null : p));
  };

  const validTimes = isValidSchedule(s.notifStart, s.alarmStart);
  const takenTonight = s.takenOn === cycleKeyFor(new Date());
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const updateLabel = Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded';

  return (
    <View style={styles.root}>
    <Screen scroll header={<SheetHeader icon="check" title={t('settings.title')} onPress={() => navigation.goBack()} pinned />}>
      <ConfirmDialog
        visible={askNormal}
        title={t('settings.previewTitle')}
        cancelLabel={t('settings.previewNotNow')}
        confirmLabel={t('settings.previewRing')}
        onCancel={() => setAskNormal(false)}
        onConfirm={() => {
          setAskNormal(false);
          setPlaying('classic');
          setRingingSoon(true);
          void ringNormalPreview(s.language).then((ok) => {
            if (!ok) {
              setRingingSoon(false);
              setPlaying(null);
            }
          });
        }}
      />

      <SectionTitle size="lg">{t('settings.name')}</SectionTitle>
      <Card size="lg">
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={() => s.setName(name)}
          returnKeyType="done"
          style={[styles.nameInput, textStyle('bodyLarge', s.language), { color: c.textPrimary, textAlign: dir.textAlign }]}
        />
      </Card>

      <SectionTitle size="lg">{t('settings.schedule')}</SectionTitle>
      <Card size="lg">
        <TimePickerRow
          size="lg"
          label={t('settings.notifStart')}
          value={s.notifStart}
          onChange={(v) => s.setTimes(v, s.alarmStart)}
          expanded={openPicker === 'notif'}
          onToggle={() => togglePicker('notif')}
        />
        <TimePickerRow
          size="lg"
          label={t('settings.alarmStart')}
          value={s.alarmStart}
          onChange={(v) => s.setTimes(s.notifStart, v)}
          last
          hint={validTimes ? undefined : t('settings.invalidTimes')}
          expanded={openPicker === 'alarm'}
          onToggle={() => togglePicker('alarm')}
        />
      </Card>

      <SectionTitle size="lg">{t('settings.language')}</SectionTitle>
      <Card size="lg">
        <View style={[styles.chips, dir.row]}>
          {(['he', 'en'] as Language[]).map((lang) => (
            <Chip key={lang} large label={t(`language.${lang}` as const)} active={s.language === lang} onPress={() => s.setLanguage(lang)} />
          ))}
        </View>
      </Card>

      <SectionTitle size="lg">{t('settings.sound')}</SectionTitle>
      <Card size="lg">
        <View style={[styles.chips, dir.row]}>
          {(['classic', 'gentle', 'tone'] as SoundChoice[]).map((snd) => (
            <Chip
              key={snd}
              large
              label={t(`sound.${snd}` as const)}
              active={s.sound === snd}
              leading={playing === snd ? <EqBars color={c.accent} /> : undefined}
              onPress={() => tapSound(snd)}
            />
          ))}
        </View>
        <AppText variant="captionLarge" color={c.textTertiary} style={styles.cardNote}>
          {ringingSoon ? t('settings.ringingSoon') : t('settings.soundHint')}
        </AppText>
      </Card>

      <SectionTitle size="lg">{t('settings.snooze')}</SectionTitle>
      <Card size="lg">
        <NumberWheelRow
          size="lg"
          label={t('settings.snoozeRow')}
          value={s.snoozeMinutes}
          min={1}
          max={20}
          format={(n) => t('snooze.min', { n })}
          onChange={s.setSnoozeMinutes}
          hint={t('settings.snoozeHint')}
          last
          expanded={openPicker === 'snooze'}
          onToggle={() => togglePicker('snooze')}
        />
      </Card>

      <SectionTitle size="lg">{t('settings.paused')}</SectionTitle>
      <Card size="lg">
        <Row
          size="lg"
          label={t('settings.paused')}
          hint={t('settings.pausedHint')}
          last
          right={
            <Switch
              value={s.paused}
              onValueChange={(v) => {
                haptics.select();
                s.setPaused(v);
              }}
              trackColor={{ true: c.accent, false: c.surfaceRaised }}
              thumbColor="#FFFFFF"
              style={styles.switch}
            />
          }
        />
      </Card>

      <SectionTitle size="lg">{t('settings.about')}</SectionTitle>
      <Card size="lg">
        {takenTonight && <Row size="lg" label={t('settings.undoTaken')} onPress={() => s.undoTaken()} destructive />}
        <Row size="lg" label={t('settings.tester')} onPress={() => navigation.navigate('Tester')} />
        <Row size="lg" label={t('settings.version', { v: version })} value={`${Updates.runtimeVersion ?? '—'} · ${updateLabel}`} last />
      </Card>
    </Screen>
      {dir.isRTL && <EdgeSwipeBack onBack={() => navigation.goBack()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nameInput: { paddingVertical: 22 },
  chips: { gap: 10, paddingVertical: 22, flexWrap: 'wrap' },
  cardNote: { marginTop: -8, paddingBottom: 20 },
  switch: { transform: [{ scale: 1.15 }] },
});

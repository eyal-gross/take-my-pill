import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Card, Row } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { TimePickerRow } from '../../components/TimePickerRow';
import { isValidSchedule } from '../../engine/cycle';
import type { TimeOfDay } from '../../engine/types';
import { useDir } from '../../hooks/useDir';
import { haptics } from '../../hooks/useHaptics';
import { formatTimeOfDay, useT, type Language } from '../../i18n';
import { Alarms } from '../../services/alarms';
import { bannerPermissionGranted, requestBannerPermission } from '../../services/banners';
import { useAppStore } from '../../store/useAppStore';
import { textStyle } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Step = 'language' | 'name' | 'notif' | 'alarm' | 'permissions';
const STEPS: Step[] = ['language', 'name', 'notif', 'alarm', 'permissions'];

type PermState = 'idle' | 'granted' | 'denied';

export function OnboardingScreen() {
  const theme = useTheme();
  const t = useT();
  const dir = useDir();
  const c = theme.colors;
  const store = useAppStore();

  const [step, setStep] = useState<Step>('language');
  const [name, setName] = useState(store.name);
  const [notif, setNotif] = useState<TimeOfDay>(store.notifStart);
  const [alarm, setAlarm] = useState<TimeOfDay>(store.alarmStart);
  const [alarmPerm, setAlarmPerm] = useState<PermState>('idle');
  const [bannerPerm, setBannerPerm] = useState<PermState>('idle');

  useEffect(() => {
    if (step !== 'permissions') return;
    if (Alarms.available() && Alarms.authorizationState() === 'authorized') setAlarmPerm('granted');
    bannerPermissionGranted().then((g) => g && setBannerPerm('granted'));
  }, [step]);

  const index = STEPS.indexOf(step);
  const validTimes = isValidSchedule(notif, alarm);

  const next = () => {
    haptics.light();
    if (step === 'name') store.setName(name);
    if (step === 'alarm') store.setTimes(notif, alarm);
    if (step === 'permissions') {
      store.completeOnboarding();
      return;
    }
    setStep(STEPS[index + 1]);
  };
  const back = () => index > 0 && setStep(STEPS[index - 1]);

  const pickLanguage = (lang: Language) => {
    haptics.select();
    store.setLanguage(lang);
  };

  const askAlarms = async () => {
    const state = await Alarms.requestAuthorization();
    setAlarmPerm(state === 'authorized' ? 'granted' : 'denied');
  };
  const askBanners = async () => {
    const ok = await requestBannerPermission();
    setBannerPerm(ok ? 'granted' : 'denied');
  };

  const canContinue =
    step === 'language' || (step === 'name' ? name.trim().length > 0 : step === 'alarm' ? validTimes : true);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        {/* edge-to-edge segments, filling from the start side: left-to-right in English, right-to-left in Hebrew */}
        <View style={[styles.progress, dir.row]}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.segment, { backgroundColor: i <= index ? c.accent : c.surfaceRaised }]} />
          ))}
        </View>

        <Animated.View key={step} entering={FadeInDown.duration(380)} exiting={FadeOutUp.duration(200)} style={styles.body}>
          {step === 'language' && (
            <>
              <AppText variant="display">{t('onboarding.langTitle')}</AppText>
              <AppText variant="body" color={c.textSecondary} style={styles.subtitle}>
                {t('onboarding.langSubtitle')}
              </AppText>
              <View style={styles.langGrid}>
                {(['he', 'en'] as Language[]).map((lang) => {
                  const active = store.language === lang;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => pickLanguage(lang)}
                      style={[styles.langCard, { backgroundColor: c.surface, borderColor: active ? c.accent : 'transparent', borderRadius: theme.radius.lg }]}
                    >
                      <AppText variant="displaySmall" color={active ? c.accent : c.textPrimary} align="center">
                        {t(`language.${lang}` as const)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 'name' && (
            <>
              <AppText variant="display">{t('onboarding.nameTitle')}</AppText>
              <AppText variant="body" color={c.textSecondary} style={styles.subtitle}>
                {t('onboarding.nameSubtitle')}
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('onboarding.namePlaceholder')}
                placeholderTextColor={c.textTertiary}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => canContinue && next()}
                style={[
                  styles.input,
                  textStyle('displaySmall', store.language),
                  { color: c.textPrimary, borderBottomColor: c.accent, textAlign: dir.textAlign, writingDirection: dir.writingDirection },
                ]}
              />
            </>
          )}

          {step === 'notif' && (
            <>
              <AppText variant="display">{t('onboarding.notifTitle')}</AppText>
              <AppText variant="body" color={c.textSecondary} style={styles.subtitle}>
                {t('onboarding.notifSubtitle')}
              </AppText>
              <Card>
                <TimePickerRow label={t('settings.notifStart')} value={notif} onChange={setNotif} open last />
              </Card>
              <AppText variant="caption" color={c.textTertiary} align="center">
                {t('onboarding.recommended', { time: formatTimeOfDay(18, 0) })}
              </AppText>
            </>
          )}

          {step === 'alarm' && (
            <>
              <AppText variant="display">{t('onboarding.alarmTitle')}</AppText>
              <AppText variant="body" color={c.textSecondary} style={styles.subtitle}>
                {t('onboarding.alarmSubtitle')}
              </AppText>
              <Card>
                <TimePickerRow label={t('settings.alarmStart')} value={alarm} onChange={setAlarm} open last />
              </Card>
              <AppText variant="caption" color={validTimes ? c.textTertiary : c.danger} align="center">
                {validTimes ? t('onboarding.recommended', { time: formatTimeOfDay(21, 0) }) : t('settings.invalidTimes')}
              </AppText>
            </>
          )}

          {step === 'permissions' && (
            <>
              <AppText variant="display" style={{ marginBottom: 28 }}>
                {t('onboarding.permTitle')}
              </AppText>
              <Card>
                <Row
                  label={t('onboarding.permAlarms')}
                  right={<PermButton state={alarmPerm} onPress={askAlarms} />}
                  hint={alarmPerm === 'denied' ? t('onboarding.denied') : undefined}
                />
                <Row
                  label={t('onboarding.permNotifications')}
                  right={<PermButton state={bannerPerm} onPress={askBanners} />}
                  hint={bannerPerm === 'denied' ? t('onboarding.denied') : undefined}
                  last
                />
              </Card>
            </>
          )}
        </Animated.View>

        <View style={styles.footer}>
          {step === 'permissions' && (
            <AppText variant="caption" color={c.textTertiary} align="center" style={{ marginBottom: 12 }}>
              {t('onboarding.finishNote')}
            </AppText>
          )}
          <View style={[dir.row, { gap: 12 }]}>
            {index > 0 && <Button label={t('common.back')} variant="ghost" onPress={back} style={{ flex: 1 }} />}
            <Button
              label={step === 'permissions' ? t('onboarding.start') : t('common.next')}
              onPress={next}
              disabled={!canContinue}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PermButton({ state, onPress }: { state: PermState; onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  const c = theme.colors;
  if (state === 'granted') {
    return (
      <View style={[styles.permPill, { backgroundColor: c.successSoft }]}>
        <AppText variant="label" color={c.success}>
          {t('onboarding.allowed')}
        </AppText>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={[styles.permPill, { backgroundColor: c.accentSoft }]}>
      <AppText variant="label" color={c.accent}>
        {t('onboarding.allow')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 6, marginBottom: 32 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  body: { flex: 1 },
  subtitle: { marginTop: 10, marginBottom: 28 },
  langGrid: { gap: 14 },
  langCard: { paddingVertical: 30, borderWidth: 1.5 },
  input: { borderBottomWidth: 2, paddingVertical: 10 },
  footer: { paddingTop: 12 },
  permPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});

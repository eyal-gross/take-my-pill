import { PillAlarm, isAlarmKitAvailable, type AlarmAuthorizationState } from '../../modules/pill-alarm';
import type { Slot } from '../engine/types';
import { translate, type Language } from '../i18n';
import type { SoundChoice } from '../store/useAppStore';
import { themes } from '../theme/tokens';
import { capabilities } from './capabilities';


export const GENTLE_SOUND_FILE = 'gentle.caf';
export const TONE_SOUND_FILE = 'tone.caf';

/** '' = the iPhone's own alarm sound. Builds without tone.caf fall back to the song. */
export function soundFileFor(sound: SoundChoice): string {
  if (sound === 'classic') return '';
  if (sound === 'tone') return capabilities.toneSound ? TONE_SOUND_FILE : GENTLE_SOUND_FILE;
  return GENTLE_SOUND_FILE;
}

export const Alarms = {
  available: isAlarmKitAvailable,

  authorizationState: (): AlarmAuthorizationState => PillAlarm.authorizationState(),

  requestAuthorization: (): Promise<AlarmAuthorizationState> => PillAlarm.requestAuthorization(),

  /** Push the localized strings the native intents need while JS is asleep. Call on every language change. */
  syncStrings: (language: Language) => {
    PillAlarm.setStrings({
      tapToOpenTitle: translate(language, 'alarm.tapToOpenTitle'),
      tapToOpenBody: translate(language, 'alarm.tapToOpenBody'),
    });
  },

  schedule: (slot: Slot, language: Language, sound: SoundChoice, snoozeMinutes: number): Promise<void> =>
    PillAlarm.schedule({
      id: slot.id,
      fireAt: slot.fireAt.getTime(),
      title: translate(language, 'alarm.title'),
      // iOS Snooze (zz) on the alarm; after a tap the same alarm counts down, then rings again.
      buttonText: translate(language, 'alarm.snoozeButton'),
      buttonSymbol: 'zzz',
      sound: soundFileFor(sound),
      tintHex: themes.dark.colors.accent,
      snoozeMinutes: Math.max(1, snoozeMinutes),
      lang: language,
      countdownTitle: translate(language, 'alarm.countdownTitle'),
      ringsInLabel: translate(language, 'alarm.ringsIn'),
      stopLabel: translate(language, 'alarm.stop'),
    }),

  /** State per alarm id (scheduled / countdown / paused / alerting). */
  listAlarmStates: () => PillAlarm.listAlarmStates(),
  /** Alarm and banner ids a snooze replaced (do not re-create them until the snooze ends). */
  listSkipped: () => PillAlarm.listSkipped(),

  cancel: (id: string) => PillAlarm.cancel(id),
  cancelAll: () => PillAlarm.cancelAll(),
  listScheduled: () => PillAlarm.listScheduled(),
  drainEvents: () => PillAlarm.drainEvents(),
};

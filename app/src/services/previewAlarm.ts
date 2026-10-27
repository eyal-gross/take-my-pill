import * as Notifications from 'expo-notifications';
import { PillAlarm } from '../../modules/pill-alarm';
import { translate, type Language } from '../i18n';
import { themes } from '../theme/tokens';
import { Alarms } from './alarms';

/**
 * "Normal" is the iPhone's own alarm sound, and iOS only plays it as a real alarm. To let her hear
 * it from Settings we ring a one-off test alarm a few seconds from now.
 *
 * reconcile() cancels any alarm it did not plan, so preview ids are protected for a few minutes.
 */
const PROTECT_MS = 3 * 60_000;
// AlarmKit needs a time in the future. Aim as close to now as iOS accepts, stepping out on rejection.
const TRY_DELAYS_MS = [250, 600, 1200];
const protectedUntil = new Map<string, number>();

export function isPreviewAlarm(id: string, now = Date.now()): boolean {
  const until = protectedUntil.get(id.toLowerCase());
  if (until === undefined) return false;
  if (now > until) {
    protectedUntil.delete(id.toLowerCase());
    return false;
  }
  return true;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Returns false when alarms are not allowed on this phone. */
export async function ringNormalPreview(language: Language): Promise<boolean> {
  if (!Alarms.available() || Alarms.authorizationState() !== 'authorized') return false;
  const id = uuid();
  protectedUntil.set(id, Date.now() + PROTECT_MS);
  const options = {
    id,
    title: translate(language, 'settings.previewAlarmTitle'),
    buttonText: translate(language, 'alarm.openButton'),
    buttonSymbol: 'pills.fill',
    sound: '',
    tintHex: themes.dark.colors.accent,
  };
  for (let i = 0; i < TRY_DELAYS_MS.length; i++) {
    try {
      await PillAlarm.schedule({ ...options, fireAt: Date.now() + TRY_DELAYS_MS[i] });
      break;
    } catch (e) {
      if (i === TRY_DELAYS_MS.length - 1) throw e;
    }
  }
  // Stopping an alarm normally posts a "pill still pending, tap to open" banner. Not for a test.
  const tapToOpenId = `tap-to-open-${id}`;
  const sweep = setInterval(() => {
    Notifications.dismissNotificationAsync(tapToOpenId).catch(() => undefined);
    Notifications.cancelScheduledNotificationAsync(tapToOpenId).catch(() => undefined);
  }, 1000);
  setTimeout(() => clearInterval(sweep), PROTECT_MS);
  return true;
}

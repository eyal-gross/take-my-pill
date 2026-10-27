import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isOurSlotId } from '../engine/ids';
import type { Slot } from '../engine/types';
import { translate, type Language } from '../i18n';
import { pickFunnyLine, type FunnyTier } from '../i18n/funny';
import { isPreviewAlarm } from './previewAlarm';

export const BANNER_CATEGORY = 'PILL';
export const TOOK_IT_ACTION = 'TOOK_IT';

let configured = false;

/** Foreground presentation + the "Took it ✓" action. Safe to call repeatedly. */
export async function configureBanners(language: Language): Promise<void> {
  if (!configured) {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        // Stopping a Normal-sound test alarm must not show the "tap to open" follow-up.
        const id = n.request.identifier;
        const quiet = id.startsWith('tap-to-open-') && isPreviewAlarm(id.slice('tap-to-open-'.length));
        return { shouldShowBanner: !quiet, shouldShowList: !quiet, shouldPlaySound: !quiet, shouldSetBadge: false };
      },
    });
    configured = true;
  }
  if (Platform.OS !== 'ios') return;
  // Banner is text only (Eyal, 25 Oct 2026): no "Took it" button. Re-registering the category with
  // no actions also strips the button from banners that were scheduled before this update.
  await Notifications.setNotificationCategoryAsync(BANNER_CATEGORY, []);
}

export async function requestBannerPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true, provideAppNotificationSettings: false },
  });
  return res.granted;
}

export async function bannerPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export interface BannerFlavor {
  name: string;
  tier: FunnyTier;
}

export const Banners = {
  /** Title is a playful line chosen per slot (escalating through the night); body stays the plain reminder. */
  schedule: async (slot: Slot, language: Language, flavor: BannerFlavor): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      identifier: slot.id,
      content: {
        title: pickFunnyLine(language, flavor.tier, slot.id, flavor.name),
        body: translate(language, 'alarm.bannerBody'),
        sound: 'default',
        categoryIdentifier: BANNER_CATEGORY,
        interruptionLevel: 'timeSensitive',
        data: { slotId: slot.id, kind: 'banner' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: slot.fireAt,
      },
    });
  },

  cancel: (id: string) => Notifications.cancelScheduledNotificationAsync(id),

  cancelAll: () => Notifications.cancelAllScheduledNotificationsAsync(),

  /** Only the ids we own (the engine's deterministic ids). */
  listScheduledIds: async (): Promise<string[]> => {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((n) => n.identifier.toLowerCase()).filter(isOurSlotId);
  },

  /** Removes delivered banners from Notification Center once the pill is taken. */
  clearDelivered: () => Notifications.dismissAllNotificationsAsync(),

  /**
   * Wires the "Took it ✓" action (and a cold-start response that arrived while the app was dead).
   * Returns an unsubscribe function.
   */
  onTookIt: (handler: () => void): (() => void) => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === TOOK_IT_ACTION) handler();
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.actionIdentifier === TOOK_IT_ACTION) handler();
    });
    return () => sub.remove();
  },
};

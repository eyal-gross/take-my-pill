# Native Alarm Research - iOS & Android (July 2026)

Research for converting Take My Pill from a PWA into a native mobile app (React Native + Expo, dev builds).

**Target UX:** user sets a window (e.g. 10pm–1am) → app fires a loud, real alarm every 30 minutes (~7 alarms) → user taps "Took my pill" (in the app OR on the alarm itself) → all remaining alarms cancel instantly.

**Verdict: fully achievable on Android today, and on iOS 26+ (~80% of iPhones as of June 2026) via AlarmKit. No Apple or Google approval gate on either path.**

---

## Feasibility summary

| Requirement | iOS 26+ (AlarmKit) | iOS <26 (notification fallback) | Android (AlarmManager) |
|---|---|---|---|
| Loud, breaks silent mode / DND | ✅ Yes | ❌ Not without Critical Alerts entitlement (Apple-gated, uncertain) | ✅ Yes (alarm audio stream + full-screen intent) |
| ~7 alarms in a window | ✅ Yes | ✅ Yes (under 64-notification cap) | ✅ Yes |
| Cancel ALL on one tap | ✅ `stop(id:)` per alarm | ✅ cancel per notification | ✅ `cancel(pendingIntent)` per alarm |
| "Took my pill" button on the alarm/lock screen itself | ✅ Custom secondary button | ✅ Notification action | ✅ Notification action |
| Survives force-quit | ✅ OS-scheduled | ✅ OS-scheduled | Mostly ✅ (explicit Force Stop kills it; some OEMs like Xiaomi/Huawei aggressive) |
| Survives reboot | Likely ✅ (verify in practice) | ✅ | ❌ Must re-register via BOOT_COMPLETED receiver |
| Approval needed from Apple/Google | ❌ None - standard App Review only | Critical Alerts = yes, hand-reviewed | ❌ None - user-grantable permissions + Play Console self-declaration |

---

## iOS - AlarmKit (iOS 26+)

Apple's new framework (WWDC 2025) that finally lets third-party apps ring **real alarms** - same tier as the system Clock app.

**The app becomes its own alarm clock.** Alarms belong to the app, are fully managed from inside it, and never appear in Apple's Clock app. The app CANNOT touch alarms in Apple's Clock app (no iOS API for that exists at all).

### CAN DO
- Alarms break through silent mode (mute switch) AND Focus/DND. Full-screen lock-screen alert + Dynamic Island.
- One-time, countdown, and weekly-recurring schedules.
- Custom buttons on the ringing alarm: `AlarmPresentation.Alert` supports a `stopButton` + `secondaryButton` with `.snooze` or `.custom` behavior (custom runs an App Intent - e.g. "Took my pill" without unlocking the phone).
- Programmatic cancel: `AlarmManager.shared.stop(id:)` - loop over stored IDs to mass-cancel.
- No hard cap on concurrent alarms found in any source (7 is trivial regardless).

### Permission model - NO special approval (verified, important)
- Only requirement: `NSAlarmKitUsageDescription` in Info.plist + runtime `AlarmManager.requestAuthorization()`. Same self-service pattern as camera/notifications. One-time user prompt.
- **The claim circulating online that AlarmKit needs a special Apple-granted entitlement (`com.apple.developer.alarmkit`) is FALSE - an AI hallucination propagated across SEO blogs.** An Apple engineer explicitly confirmed on the Developer Forums that this entitlement does not exist ("We are seeing an increase in LLMs making up non-existent entitlements..."). Adding it to entitlements.plist actually BREAKS provisioning. Source: https://developer.apple.com/forums/thread/797950
- Production proof it ships with normal App Review only: **AlarmK – Mission Alarm** (App Store id6772219821, "Powered by iOS 26 AlarmKit so it rings through Silent and Focus"), **Alarmy**, **ToDo Alarm**.

### Caveats
- **iOS 26+ only.** Adoption (Apple official numbers): 66% of iPhones Feb 2026 → **79% of all iPhones / 86% of last-4-years iPhones by June 2026**. ~1 in 5 users needs the fallback path.
- Young API: confirmed regression in an iOS 26.2 **beta** where alarms silently stopped ringing (forums thread #809398, FB21273655; appears resolved by 26.2 RC). Test on latest iOS.
- AlarmKit expects a **widget extension** if using countdown presentation, otherwise the system may unexpectedly dismiss alarms - extra implementation piece, not optional.
- Real-world gotcha from an AlarmK user review: the app was missing from the user's Focus allow-list, blocking silent-mode breakthrough until manually fixed - plan a one-time onboarding hint about Focus settings.
- No native "repeat every 30 min until dismissed" primitive - schedule N discrete alarms and cancel each remaining one on tap. Store all alarm IDs.

### Fallback for iOS <26: local notifications (expo-notifications)
- `interruptionLevel: 'timeSensitive'` breaks through Focus but does **NOT** bypass the mute switch. This is the realistic fallback: reminders work, just not loud in silent mode.
- `interruptionLevel: 'critical'` DOES bypass the mute switch but requires the **Critical Alerts entitlement** - genuinely Apple-gated, hand-reviewed, health/safety only. A medication app is a plausible candidate but approval isn't guaranteed (days–weeks turnaround). Worth applying, don't depend on it.
- iOS caps 64 pending local notifications per app (7 is fine). Custom sounds truncate at ~30s. Action buttons work. Notifications fire even after force-quit.

## Android - AlarmManager

Fully solved problem; Android apps have always been able to be real alarm clocks.

### CAN DO
- `AlarmManager.setAlarmClock()` - strongest guarantee, treated like a real alarm clock, fires exactly on time even in Doze (deep sleep). Use this per alarm time.
- Loud through silent/DND: play sound on `AudioAttributes.USAGE_ALARM` stream (uses the Alarm volume slider, independent of ringer) + `NotificationCompat.CATEGORY_ALARM` + optional `setBypassDnd(true)` on the channel.
- Full-screen intent = lock-screen takeover UI exactly like a ringing alarm clock. Android 14+/Play policy (since Jan 2025): auto-granted only to apps self-declaring "alarm" core functionality in Play Console - a pill-reminder-with-alarm app qualifies; fallback is sending the user to a Settings toggle.
- "Took the pill" action button on the notification runs in background, no app launch needed.
- Mass cancel: `AlarmManager.cancel(pendingIntent)` per alarm (PendingIntents must be rebuilt with identical request codes).

### Permissions
- `SCHEDULE_EXACT_ALARM`: required; on Android 13+ NOT pre-granted - user flips it on via a system settings screen the app links to (`ACTION_REQUEST_SCHEDULE_EXACT_ALARM`). One-time.
- `USE_EXACT_ALARM` (install-time, no user action) is restricted by Play review to alarm/calendar-core apps - could be argued for this app, but plan on `SCHEDULE_EXACT_ALARM` to be safe.

### Caveats
- **Reboot wipes all AlarmManager alarms.** Standard fix: `BOOT_COMPLETED` receiver (declared disabled in manifest, enabled programmatically while alarms are pending) that re-schedules on boot.
- Explicit Settings → Force Stop kills all alarms. Swiping from Recents does NOT on stock Android, but aggressive OEM skins (Xiaomi/MIUI, Huawei) may kill anyway - test on those devices if targeting those markets (dontkillmyapp.com class of problem).

### Do NOT use: the system Clock intent path
`AlarmClock.ACTION_SET_ALARM` can silently insert alarms into the user's Clock app - but there is **no API to query, modify, or cancel** them afterward, so "cancel all on tap" is impossible through this path. Also no custom action buttons. The npm packages `expo-alarm-module` / `expo-alarm` wrap exactly this intent - **avoid them.**

## App Store review risk (medical classification)

A pill reminder that schedules alarms + logs "took it" is a normal Health & Fitness app - standard review. Guideline 5.1.3 concerns don't apply unless the app: calculates drug dosages (requires an approved source), makes diagnostic claims, or misuses HealthKit data for ads. Avoid dosage-calculation features and this is a non-issue.

## Recommended technical approach (Expo)

- **Stack:** Expo dev build (config plugins), same workflow as Swellyo.
- **Android:** **Notifee** (free) - the only maintained RN lib with full-screen intents + exact AlarmManager triggers + alarm-stream/bypass-DND channel support. `expo-notifications` alone cannot do this on Android.
- **iOS 26+:** thin custom **Swift native module** for AlarmKit (schedule / stop / requestAuthorization exposed to JS) - no mature RN/Expo wrapper existed as of July 2026. Include the widget extension (countdown presentation requirement).
- **iOS <26 fallback:** `expo-notifications` with `timeSensitive` interruption level; optionally apply for Critical Alerts entitlement for true silent-mode breakthrough.
- Persist all scheduled alarm IDs locally; on Android BOOT_COMPLETED and on app cold start, re-derive and re-schedule any still-pending alarms for the current window.

## Sources

- https://developer.apple.com/documentation/AlarmKit
- https://developer.apple.com/documentation/AlarmKit/scheduling-an-alarm-with-alarmkit
- https://wwdcnotes.com/documentation/wwdcnotes/wwdc25-230-wake-up-to-the-alarmkit-api/ (WWDC25 session - confirms Info.plist + requestAuthorization is the only gate)
- https://developer.apple.com/forums/thread/797950 (Apple engineer: com.apple.developer.alarmkit entitlement does NOT exist / LLM hallucination)
- https://developer.apple.com/forums/thread/809398 (iOS 26.2-beta alarm-silently-fails regression, FB21273655)
- https://apps.apple.com/us/app/alarmk-mission-alarm/id6772219821 (shipped production AlarmKit app)
- https://www.macrumors.com/2026/06/09/ios-26-adoption-stats-wwdc/ (79% / 86% iOS 26 adoption, June 2026)
- https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts
- https://developer.apple.com/app-store/review/guidelines/ (Guideline 5.1.3)
- https://developer.android.com/develop/background-work/services/alarms
- https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- https://support.google.com/googleplay/android-developer/answer/13392821 (full-screen intent Play policy)
- https://developer.android.com/reference/android/provider/AlarmClock (ACTION_SET_ALARM limits)
- https://notifee.app/react-native/docs/triggers/
- https://docs.expo.dev/versions/latest/sdk/notifications/

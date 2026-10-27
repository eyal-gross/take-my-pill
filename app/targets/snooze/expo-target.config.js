/**
 * Widget extension that draws the snooze countdown (Live Activity) on the lock screen,
 * in the Dynamic Island and in StandBy. AlarmKit requires apps that use its countdown
 * (Snooze) to provide this. See "Snooze" in the README.
 *
 * Files in ./_shared are compiled into BOTH this widget and the main app (the alarm metadata
 * type and the countdown's Stop intent must exist in both).
 */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'SnoozeCountdown',
  displayName: 'Take My Pill',
  bundleIdentifier: '.snooze',
  deploymentTarget: '26.1',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AlarmKit', 'AppIntents'],
};

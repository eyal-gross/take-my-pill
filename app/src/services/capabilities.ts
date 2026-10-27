import * as Updates from 'expo-updates';

/**
 * What the installed native build can do. OTA updates reach older builds too, so UI for a feature
 * that needs native code must check this first and explain "arrives with the next update" instead.
 *
 * runtimeVersion 1.0.1 = TestFlight build 6. 1.0.2+ adds: the Gentle tone file, the preview audio
 * player, and the native Snooze button.
 */
function runtimeAtLeast(target: [number, number, number]): boolean {
  const rv = Updates.runtimeVersion;
  // Dev / embedded runs without a runtime version: assume the newest native code.
  if (!rv) return true;
  const parts = rv.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const a = parts[i] ?? 0;
    if (a !== target[i]) return a > target[i];
  }
  return true;
}

export const NATIVE_V2 = runtimeAtLeast([1, 0, 2]);

export const capabilities = {
  /** The original tone, mastered to alarm volume, bundled as tone.caf. */
  toneSound: NATIVE_V2,
  /** 15-second sound previews in Settings. */
  soundPreview: NATIVE_V2,
  /** Snooze button on the alarm (replaces Open). */
  snooze: NATIVE_V2,
};

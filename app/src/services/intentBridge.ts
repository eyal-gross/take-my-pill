import { AppState, type AppStateStatus } from 'react-native';
import { Alarms } from './alarms';
import { reconcile } from './reconcile';

export type IntentListener = (event: { action: 'stopped' | 'opened' | 'snoozed' | 'snoozeStopped'; alarmId: string; at: number; until?: number }) => void;

/**
 * The lock-screen intents run while JS may be asleep; they leave a note in UserDefaults.
 * On launch and on every return to the foreground we read those notes, let the UI react,
 * and reconcile (a stop may have consumed an alarm, a day may have rolled over, etc).
 */
export function startIntentBridge(onEvent?: IntentListener): () => void {
  const drain = () => {
    const events = Alarms.drainEvents();
    for (const e of events) onEvent?.(e);
    reconcile();
  };

  drain();

  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') drain();
  });
  // A lock-screen button can be used while the app stays in the foreground (no AppState change).
  const poll = setInterval(() => {
    if (AppState.currentState !== 'active') return;
    const events = Alarms.drainEvents();
    if (events.length === 0) return;
    for (const e of events) onEvent?.(e);
    reconcile();
  }, 3000);
  return () => {
    sub.remove();
    clearInterval(poll);
  };
}

/**
 * Snooze wiring (build 9): Settings length -> store -> every scheduled alarm -> mockNative options,
 * and reconcile's rules for ringing / counting-down alarms and snooze-skipped slots.
 * Only the native layer (PillAlarm), mockBanners and storage are mocked.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-updates', () => ({ runtimeVersion: '1.0.3', updateId: null }));
jest.mock('expo-notifications', () => ({
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

const mockNative = {
  schedule: jest.fn((_o: Record<string, unknown>) => Promise.resolve()),
  cancel: jest.fn((_id: string) => Promise.resolve()),
  cancelAll: jest.fn(() => Promise.resolve()),
  listScheduled: jest.fn(() => Promise.resolve([] as string[])),
  listAlarmStates: jest.fn(() => new Map<string, string>()),
  listSkipped: jest.fn(() => new Set<string>()),
  authorizationState: jest.fn(() => 'authorized'),
  requestAuthorization: jest.fn(() => Promise.resolve('authorized')),
  setStrings: jest.fn(),
  drainEvents: jest.fn(() => []),
};
// Getters: jest hoists these factories above the const declarations, so resolve lazily.
jest.mock('../modules/pill-alarm', () => ({
  get PillAlarm() {
    return mockNative;
  },
  isAlarmKitAvailable: () => true,
}));

const mockBanners = {
  listScheduledIds: jest.fn(() => Promise.resolve([] as string[])),
  cancel: jest.fn(() => Promise.resolve()),
  schedule: jest.fn(() => Promise.resolve()),
};
jest.mock('../src/services/banners', () => ({
  get Banners() {
    return mockBanners;
  },
}));

import { cycleKeyFor } from '../src/engine';
import { Alarms } from '../src/services/alarms';
import { ringNormalPreview } from '../src/services/previewAlarm';
import { reconcile, rescheduleEverything } from '../src/services/reconcile';
import { selectScheduleInputs, useAppStore } from '../src/store/useAppStore';

const local = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0);
const NOW = local(2026, 10, 25, 20, 0); // before the 21:00 alarm start

const ready = (extra: Partial<ReturnType<typeof useAppStore.getState>> = {}) =>
  useAppStore.setState({
    hydrated: true,
    onboarded: true,
    language: 'he',
    sound: 'gentle',
    snoozeMinutes: 5,
    paused: false,
    takenOn: null,
    quietTimes: [],
    testerFrom: null,
    testerUntil: null,
    ...extra,
  });

const alarmCalls = () => mockNative.schedule.mock.calls.map((c) => c[0] as Record<string, unknown>);

beforeEach(() => {
  jest.clearAllMocks();
  mockNative.listScheduled.mockResolvedValue([]);
  mockNative.listAlarmStates.mockReturnValue(new Map());
  mockNative.listSkipped.mockReturnValue(new Set());
  ready();
});

describe('snooze length setting', () => {
  it('clamps to whole minutes between 1 and 20', () => {
    const { setSnoozeMinutes } = useAppStore.getState();
    setSnoozeMinutes(0);
    expect(useAppStore.getState().snoozeMinutes).toBe(1);
    setSnoozeMinutes(25);
    expect(useAppStore.getState().snoozeMinutes).toBe(20);
    setSnoozeMinutes(7.4);
    expect(useAppStore.getState().snoozeMinutes).toBe(7);
  });

  it('is part of the schedule inputs, so a change rebuilds the alarms', () => {
    const a = selectScheduleInputs(useAppStore.getState());
    useAppStore.getState().setSnoozeMinutes(12);
    const b = selectScheduleInputs(useAppStore.getState());
    expect(a.snoozeMinutes).toBe(5);
    expect(b.snoozeMinutes).toBe(12);
  });
});

describe('alarms carry the snooze length and countdown texts', () => {
  it('every alarm reconcile schedules uses the Settings value', async () => {
    ready({ snoozeMinutes: 12 });
    await reconcile(NOW);
    const calls = alarmCalls();
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c.snoozeMinutes).toBe(12);
      expect(c.buttonSymbol).toBe('zzz');
      expect(c.buttonText).toBe('נודניק');
      expect(c.lang).toBe('he');
      expect(c.countdownTitle).toBe('נודניק');
      expect(c.ringsInLabel).toBe('יצלצל שוב בעוד');
      expect(c.stopLabel).toBe('עצירה');
    }
  });

  it('a new length reaches the alarms after a rebuild', async () => {
    ready({ snoozeMinutes: 3 });
    await rescheduleEverything();
    expect(alarmCalls().every((c) => c.snoozeMinutes === 3)).toBe(true);
  });

  it('English texts in English', async () => {
    ready({ language: 'en' });
    await reconcile(NOW);
    const c = alarmCalls()[0];
    expect(c.buttonText).toBe('Snooze');
    expect(c.countdownTitle).toBe('Snoozed');
    expect(c.ringsInLabel).toBe('Rings again in');
  });

  it('never sends 0 minutes for a real alarm (0 means test alarm, Stop only)', () => {
    Alarms.schedule({ id: 'a', kind: 'alarm', fireAt: NOW, cycleKey: '2026-10-25' } as never, 'en', 'gentle', 0);
    expect(alarmCalls()[0].snoozeMinutes).toBe(1);
  });

  it('the Normal test alarm has no snooze (Stop only)', async () => {
    await ringNormalPreview('en');
    const c = alarmCalls()[0];
    expect(c.snoozeMinutes ?? 0).toBe(0);
    expect(c.sound).toBe('');
  });
});

describe('reconcile and a ringing / snoozed alarm', () => {
  const SNOOZED = '11111111-1111-4111-8111-111111111111';

  it('keeps an alarm that is counting down (snoozed)', async () => {
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'countdown']]));
    await reconcile(NOW);
    expect(mockNative.cancel).not.toHaveBeenCalledWith(SNOOZED);
  });

  it('keeps an alarm that is ringing', async () => {
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'alerting']]));
    await reconcile(NOW);
    expect(mockNative.cancel).not.toHaveBeenCalledWith(SNOOZED);
  });

  it('cancels the snooze once she took the pill', async () => {
    ready({ takenOn: cycleKeyFor(NOW) });
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'countdown']]));
    await reconcile(NOW);
    expect(mockNative.cancel).toHaveBeenCalledWith(SNOOZED);
  });

  it('cancels the snooze when paused', async () => {
    ready({ paused: true });
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'countdown']]));
    await reconcile(NOW);
    expect(mockNative.cancel).toHaveBeenCalledWith(SNOOZED);
  });

  it('cancels the snooze when a quiet time is on', async () => {
    ready({ quietTimes: [{ id: 'q', dateKey: '2026-10-25', from: { h: 19, m: 0 }, to: { h: 23, m: 0 } }] });
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'countdown']]));
    await reconcile(NOW);
    expect(mockNative.cancel).toHaveBeenCalledWith(SNOOZED);
  });

  it('a full rebuild (sound / language / length change) keeps a running snooze', async () => {
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'countdown']]));
    await rescheduleEverything();
    expect(mockNative.cancel).not.toHaveBeenCalledWith(SNOOZED);
    expect(mockNative.cancelAll).not.toHaveBeenCalled();
  });

  it('cancels an unplanned alarm that is just scheduled (stale)', async () => {
    mockNative.listScheduled.mockResolvedValue([SNOOZED]);
    mockNative.listAlarmStates.mockReturnValue(new Map([[SNOOZED, 'scheduled']]));
    await reconcile(NOW);
    expect(mockNative.cancel).toHaveBeenCalledWith(SNOOZED);
  });
});

describe('a snooze replaces the alarms inside its window', () => {
  it('does not re-create a skipped alarm', async () => {
    await reconcile(NOW);
    const first = alarmCalls()[0].id as string;
    jest.clearAllMocks();
    mockNative.listScheduled.mockResolvedValue([]);
    mockNative.listAlarmStates.mockReturnValue(new Map());
    mockNative.listSkipped.mockReturnValue(new Set([first.toLowerCase()]));
    await reconcile(NOW);
    expect(alarmCalls().map((c) => c.id)).not.toContain(first);
    expect(alarmCalls().length).toBeGreaterThan(0);
  });
});

describe('Home snooze status from the mockNative event', () => {
  it('uses the mockNative end time, and Stop clears it', () => {
    const { logAlarmEvent } = useAppStore.getState();
    logAlarmEvent({ action: 'snoozed', alarmId: 'x', at: 1000, until: 61_000 });
    expect(useAppStore.getState().snoozeUntil).toBe(61_000);
    logAlarmEvent({ action: 'snoozeStopped', alarmId: 'x', at: 2000 });
    expect(useAppStore.getState().snoozeUntil).toBeNull();
  });

  it('"Took it" clears a pending snooze', () => {
    useAppStore.getState().logAlarmEvent({ action: 'snoozed', alarmId: 'x', at: 1000, until: 61_000 });
    useAppStore.getState().markTaken(NOW);
    expect(useAppStore.getState().snoozeUntil).toBeNull();
  });
});

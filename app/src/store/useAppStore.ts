import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { cycleKeyFor } from '../engine/cycle';
import { TESTER_DURATION_MS } from '../engine/testerSchedule';
import type { QuietTime, TimeOfDay } from '../engine/types';
import type { Language } from '../i18n/types';

/** Stable ids (saved on the phone). Labels: classic = Normal, gentle = Song, tone = Gentle. */
export type SoundChoice = 'classic' | 'gentle' | 'tone';

export interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  language: Language;
  name: string;
  notifStart: TimeOfDay;
  alarmStart: TimeOfDay;
  sound: SoundChoice;
  /** Minutes until a snoozed alarm rings again (1-20). */
  snoozeMinutes: number;
  /** ms: when the last snoozed alarm rings again (null = no snooze pending). */
  snoozeUntil: number | null;
  /** Newest first, max 20: what the lock-screen buttons did (debug, shown in Tester). */
  alarmLog: { action: string; alarmId: string; at: number; until?: number }[];
  paused: boolean;
  /** Cycle key (YYYY-MM-DD of the evening) for which the pill was taken. */
  takenOn: string | null;
  takenAt: string | null;
  /** ISO timestamps, newest first, max 60. */
  history: string[];
  quietTimes: QuietTime[];
  testerUnlocked: boolean;
  testerFrom: number | null;
  testerUntil: number | null;
  /** Bumped when scheduled notification texts change, so already-scheduled banners get rebuilt once. */
  contentVersion: number;

  setHydrated: () => void;
  setContentVersion: (v: number) => void;
  setLanguage: (language: Language) => void;
  setName: (name: string) => void;
  setTimes: (notifStart: TimeOfDay, alarmStart: TimeOfDay) => void;
  setSound: (sound: SoundChoice) => void;
  setSnoozeMinutes: (minutes: number) => void;
  logAlarmEvent: (e: { action: string; alarmId: string; at: number; until?: number }) => void;
  setPaused: (paused: boolean) => void;
  markTaken: (now?: Date) => void;
  undoTaken: () => void;
  addQuietTime: (q: Omit<QuietTime, 'id'>) => void;
  updateQuietTime: (id: string, q: Omit<QuietTime, 'id'>) => void;
  removeQuietTime: (id: string) => void;
  /** Tester tool: wipe everything and return to onboarding. Alarms are cancelled by the caller. */
  resetAll: () => void;
  unlockTester: () => void;
  setTesterMode: (on: boolean, now?: Date) => void;
  clearExpiredTester: (now?: Date) => void;
  completeOnboarding: () => void;
}

const DEFAULT_NOTIF: TimeOfDay = { h: 18, m: 0 };
const DEFAULT_ALARM: TimeOfDay = { h: 21, m: 0 };

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        hydrated: false,
        onboarded: false,
        language: 'he',
        name: '',
        notifStart: DEFAULT_NOTIF,
        alarmStart: DEFAULT_ALARM,
        sound: 'gentle',
        snoozeMinutes: 5,
        snoozeUntil: null,
        alarmLog: [],
        paused: false,
        takenOn: null,
        takenAt: null,
        history: [],
        quietTimes: [],
        testerUnlocked: false,
        testerFrom: null,
        testerUntil: null,
        contentVersion: 0,

        setHydrated: () => set({ hydrated: true }),
        setContentVersion: (contentVersion) => set({ contentVersion }),
        setLanguage: (language) => set({ language }),
        setName: (name) => set({ name: name.trim() }),
        setTimes: (notifStart, alarmStart) => set({ notifStart, alarmStart }),
        setSound: (sound) => set({ sound }),
        setSnoozeMinutes: (minutes) => set({ snoozeMinutes: Math.max(1, Math.min(20, Math.round(minutes))) }),
        logAlarmEvent: (e) =>
          set({
            alarmLog: [e, ...get().alarmLog].slice(0, 20),
            ...(e.action === 'snoozed' ? { snoozeUntil: e.until ?? e.at + get().snoozeMinutes * 60_000 } : {}),
            ...(e.action === 'snoozeStopped' ? { snoozeUntil: null } : {}),
          }),
        setPaused: (paused) => set({ paused }),
        markTaken: (now = new Date()) => {
          const iso = now.toISOString();
          set({
            snoozeUntil: null,
            takenOn: cycleKeyFor(now),
            takenAt: iso,
            history: [iso, ...get().history].slice(0, 60),
            // "Took it" ends a test cycle as well
            testerFrom: null,
            testerUntil: null,
          });
        },
        undoTaken: () => {
          const { history, takenAt } = get();
          set({
            takenOn: null,
            takenAt: null,
            history: takenAt ? history.filter((h) => h !== takenAt) : history,
          });
        },
        addQuietTime: (q) =>
          set({
            quietTimes: [...get().quietTimes, { ...q, id: `${q.dateKey}-${q.from.h}${q.from.m}-${Date.now()}` }],
          }),
        updateQuietTime: (id, q) =>
          set({ quietTimes: get().quietTimes.map((existing) => (existing.id === id ? { ...q, id } : existing)) }),
        removeQuietTime: (id) => set({ quietTimes: get().quietTimes.filter((q) => q.id !== id) }),
        resetAll: () =>
          set({
            onboarded: false,
            name: '',
            notifStart: DEFAULT_NOTIF,
            alarmStart: DEFAULT_ALARM,
            sound: 'gentle',
            snoozeMinutes: 5,
            snoozeUntil: null,
            paused: false,
            takenOn: null,
            takenAt: null,
            history: [],
            quietTimes: [],
            testerUnlocked: false,
            testerFrom: null,
            testerUntil: null,
          }),
        unlockTester: () => set({ testerUnlocked: true }),
        setTesterMode: (on, now = new Date()) =>
          set(
            on
              ? { testerFrom: now.getTime(), testerUntil: now.getTime() + TESTER_DURATION_MS }
              : { testerFrom: null, testerUntil: null },
          ),
        clearExpiredTester: (now = new Date()) => {
          const { testerUntil } = get();
          if (testerUntil !== null && now.getTime() >= testerUntil) {
            set({ testerFrom: null, testerUntil: null });
          }
        },
        completeOnboarding: () => set({ onboarded: true }),
      }),
      {
        name: 'take-my-pill.v1',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (s) => ({
          onboarded: s.onboarded,
          language: s.language,
          name: s.name,
          notifStart: s.notifStart,
          alarmStart: s.alarmStart,
          sound: s.sound,
          snoozeMinutes: s.snoozeMinutes,
          snoozeUntil: s.snoozeUntil,
          alarmLog: s.alarmLog,
          paused: s.paused,
          takenOn: s.takenOn,
          takenAt: s.takenAt,
          history: s.history,
          quietTimes: s.quietTimes,
          testerUnlocked: s.testerUnlocked,
          testerFrom: s.testerFrom,
          testerUntil: s.testerUntil,
          contentVersion: s.contentVersion,
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated();
        },
      },
    ),
  ),
);

/** The slice of state that changes what should be scheduled on the device. */
export const selectScheduleInputs = (s: AppState) => ({
  onboarded: s.onboarded,
  language: s.language,
  notifStart: s.notifStart,
  alarmStart: s.alarmStart,
  sound: s.sound,
  snoozeMinutes: s.snoozeMinutes,
  paused: s.paused,
  takenOn: s.takenOn,
  quietTimes: s.quietTimes,
  testerFrom: s.testerFrom,
  testerUntil: s.testerUntil,
});

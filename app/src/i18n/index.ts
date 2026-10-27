import { useCallback } from 'react';
import { en } from './en';
import { he } from './he';
import type { Language, Strings } from './types';
import { useAppStore } from '../store/useAppStore';

export type { Language, Strings } from './types';

export const strings: Record<Language, Strings> = { en, he };

type Leaf<T> = T extends string ? string : never;
type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type StringKey = Paths<Strings>;

export function translate(language: Language, key: StringKey, params?: Record<string, string | number>): string {
  const parts = key.split('.');
  let node: unknown = strings[language];
  for (const p of parts) {
    node = (node as Record<string, unknown>)?.[p];
  }
  let out = typeof node === 'string' ? node : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out as Leaf<string>;
}

export function useLanguage(): Language {
  return useAppStore((s) => s.language);
}

export function useT() {
  const language = useLanguage();
  return useCallback(
    (key: StringKey, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );
}

/** Formats a local time as HH:MM, locale-aware (Israel and most of the world use 24h). */
export function formatTime(d: Date, language: Language): string {
  return d.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeOfDay(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDate(d: Date, language: Language): string {
  return d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

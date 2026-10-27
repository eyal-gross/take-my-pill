import type { Language } from './types';

/**
 * Reminder banner lines. Three tiers that escalate through the night:
 *  early = first hours (gentle), mid = getting late (cheeky), late = after midnight (full nagging).
 * `{name}` is replaced with the user's name. Feminine forms in Hebrew, on purpose.
 */
export type FunnyTier = 'early' | 'mid' | 'late';

const lines: Record<Language, Record<FunnyTier, string[]>> = {
  he: {
    early: [
      '{name}…',
      'הגלולה מחכה!',
      'זמן לגלולהההה',
      'מקווה שלא שכחת',
      'כולם מחכים',
      'תזכורת קטנה וחמודה: גלולה 💊',
      'אחת ליום. זאת.',
      'רגע לפני שתשכחי… 💊',
      'פינג 💊',
      'היי, זאת אני, הגלולה',
    ],
    mid: [
      'נהיה כבר די מאוחר…',
      'את עוד ערה בכלל?!',
      'טוב, כמה צריך להזכיר לך? יאללה',
      'עדיין לא? 👀',
      'הגלולה שואלת מה איתך',
      'אני לא הולכת לשום מקום עד שתלחצי "לקחתי"',
      '{name}, ברצינות',
      'זה לוקח שתי שניות. ספרתי.',
      'הגלולה מרגישה מוזנחת',
      'לא נעים לי להציק. בעצם כן.',
    ],
    late: [
      '{name}. גלולה. עכשיו.',
      'הגעתי למסקנה שאת מתעלמת ממני',
      'זה כבר לא מצחיק 😅 (קצת כן)',
      'לפני שאת נרדמת!!',
      'השעון המעורר כבר בדרך…',
      'אני אעיר אותך. את יודעת שאני אעיר אותך.',
      'אחרון חביב, {name}',
      'ככה זה הולך להיות כל הלילה?',
      'הגלולה והלילה שניהם מחכים',
      'טוב. לקחת או לא לקחת?',
    ],
  },
  en: {
    early: [
      '{name}…',
      'The pill is waiting!',
      'Pill tiiiime',
      "Hope you didn't forget",
      "Everyone's waiting",
      'Tiny cute reminder: pill 💊',
      'One a day. This one.',
      'Before you forget… 💊',
      'Ping 💊',
      "Hi, it's me, the pill",
    ],
    mid: [
      "It's getting pretty late…",
      'Are you even still awake?!',
      'Ok, how many times do I need to remind you? Come on',
      'Still not? 👀',
      'The pill is asking about you',
      "I'm not going anywhere until you tap \"Took it\"",
      '{name}, seriously',
      'It takes two seconds. I counted.',
      'The pill feels neglected',
      "I hate to nag. Actually, I don't.",
    ],
    late: [
      '{name}. Pill. Now.',
      "I've concluded you're ignoring me",
      'This stopped being funny 😅 (a little funny)',
      'Before you fall asleep!!',
      'The alarm is on its way…',
      'I will wake you up. You know I will.',
      'Last call, {name}',
      'Is this how the whole night is going to go?',
      'The pill and the night are both waiting',
      'Ok. Took it or not?',
    ],
  },
};

/** Small deterministic hash so the same slot always gets the same line, but neighbours differ. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tier from hours elapsed since the first reminder of the night. */
export function tierForHoursIntoNight(hours: number): FunnyTier {
  if (hours < 3) return 'early';
  if (hours < 6) return 'mid';
  return 'late';
}

export function pickFunnyLine(language: Language, tier: FunnyTier, seed: string, name: string): string {
  const pool = lines[language][tier];
  const line = pool[hash(seed) % pool.length];
  return line.replace('{name}', name || (language === 'he' ? 'היי' : 'Hey'));
}

export const funnyLineCount = (language: Language) =>
  lines[language].early.length + lines[language].mid.length + lines[language].late.length;

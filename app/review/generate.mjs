// Generates review/index.html: every screen of the app, EN + HE side by side, at TRUE device scale,
// built from the real string files and color tokens. Pending (not yet implemented) changes live in
// the OVERRIDES below so I can approve them here before they go into the app.
// Run: node --experimental-strip-types review/generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../src/i18n/en.ts';
import { he } from '../src/i18n/he.ts';
import { themes } from '../src/theme/tokens.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NAME = { en: 'Jane', he: 'ג׳יין' };

// ---------- PENDING CHANGES (round 3 review, Oct 25: sounds + snooze) ----------
const STRING_OVERRIDES = {
  en: {
    'sound.song': 'Song', 'sound.gentle': 'Gentle', 'sound.normal': 'Normal',
    'settings.soundHint': 'Tap a sound to hear it. Tap it again to stop.',
    'settings.normalNote': "Normal is the iPhone's own alarm sound. iPhone doesn't let apps play it as a preview.",
    'settings.snooze': 'Snooze length', 'settings.snoozeHint': 'How long until the alarm rings again after Snooze.',
    'snooze.min': '{n} min', 'alarm.snoozeButton': 'Snooze', 'settings.snoozeRow': 'Ring again after',
    'la.title': 'Snoozed', 'la.ringsIn': 'Rings again in', 'la.stop': 'Stop', 'home.snoozed': 'Snoozed · rings again at {time}',
  },
  he: {
    'sound.song': 'שיר', 'sound.gentle': 'עדין', 'sound.normal': 'רגיל',
    'settings.soundHint': 'הקישי על צליל כדי לשמוע. הקשה נוספת עוצרת.',
    'settings.normalNote': 'רגיל הוא צליל השעון המעורר של האייפון. האייפון לא מאפשר לאפליקציות להשמיע אותו מראש.',
    'settings.snooze': 'משך נודניק', 'settings.snoozeHint': 'אחרי כמה זמן השעון יצלצל שוב כשלוחצים נודניק.',
    'snooze.min': '{n} דק׳', 'alarm.snoozeButton': 'נודניק', 'settings.snoozeRow': 'לצלצל שוב אחרי',
    'la.title': 'נודניק', 'la.ringsIn': 'יצלצל שוב בעוד', 'la.stop': 'עצירה', 'home.snoozed': 'נודניק · יצלצל שוב ב-{time}',
  },
};
const COLOR_OVERRIDES = { dark: {}, light: {} }; // success color now lives in src/theme/tokens
// ----------------------------------------------------------------

const strings = { en, he };
const t = (lang, key, params = {}) => {
  let s = STRING_OVERRIDES[lang][key];
  if (s === undefined) s = key.split('.').reduce((o, k) => o?.[k], strings[lang]) ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, v);
  return s;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- building blocks (mirror src/components, sizes in pt for a 440pt-wide screen) ----------
const progress = (i) => `<div class="progress">${[0, 1, 2, 3, 4].map((n) => `<span class="pseg ${n <= i ? 'on' : ''}"></span>`).join('')}</div>`;
const display = (txt) => `<div class="display">${esc(txt)}</div>`;
const sub = (txt) => (txt ? `<div class="body sec sub">${esc(txt)}</div>` : '<div class="sub"></div>');
const button = (txt, v = 'primary') => `<div class="btn ${v}">${esc(txt)}</div>`;
const footer = (lang, i, last = false) => `<div class="footer">${last ? `<div class="caption ter center mb12">${esc(t(lang, 'onboarding.finishNote'))}</div>` : ''}<div class="row gap12">${i > 0 ? button(t(lang, 'common.back'), 'ghost') : ''}${button(last ? t(lang, 'onboarding.start') : t(lang, 'common.next'))}</div></div>`;
const card = (inner) => `<div class="card">${inner}</div>`;
const section = (txt) => `<div class="label ter section">${esc(txt).toUpperCase()}</div>`;
const row = (label, value = '', opts = {}) => `<div class="rrow ${opts.last ? 'last' : ''}"><div class="row between"><div class="body ${opts.danger ? 'danger' : ''}">${esc(label)}</div>${value ? `<div class="numeral sec">${esc(value)}</div>` : ''}${opts.right ?? ''}</div>${opts.hint ? `<div class="caption ter hint">${esc(opts.hint)}</div>` : ''}</div>`;
const chip = (txt, { active = false, tone = 'accent' } = {}) => `<div class="chip ${active ? 'active' : ''} ${tone}">${esc(txt)}</div>`;
const SOUNDS = ['normal', 'song', 'gentle'];
const eq = () => `<span class="eq"><i></i><i></i><i></i></span>`;
const sndChip = (lang, id, { active = false, playing = false } = {}) => `<div class="chip ${active ? 'active' : ''} accent snd ${playing ? 'playing' : ''}" data-snd="${id}">${playing ? eq() : ''}${esc(t(lang, 'sound.' + id))}</div>`;
const soundCard = (lang, sel = 'song', playing = null, normalNote = false) => card(`<div class="row gap10 py16 wrap sndrow">${SOUNDS.map((id) => sndChip(lang, id, { active: sel === id, playing: playing === id })).join('')}</div><div class="caption ter hint pb16">${esc(t(lang, 'settings.soundHint'))}</div><div class="caption alarmc pb16 normalnote" ${normalNote ? '' : 'hidden'}>${esc(t(lang, 'settings.normalNote'))}</div>`);
const snoozeWheel = (lang, sel) => `<div class="spinner snzwheel" data-sel="${sel}">${[-2, -1, 0, 1, 2].map((d) => { const n = sel + d; return `<div class="srow ${d === 0 ? 'cur' : ''}"><span>${n >= 1 && n <= 20 ? esc(t(lang, 'snooze.min', { n })) : '&nbsp;'}</span></div>`; }).join('')}</div>`;
const snoozeCard = (lang, sel = 5, open = true) => `<div class="snzcard">` + card(row(t(lang, 'settings.snoozeRow'), t(lang, 'snooze.min', { n: sel }), { last: !open, hint: open ? '' : t(lang, 'settings.snoozeHint') }) + (open ? snoozeWheel(lang, sel) + `<div class="caption ter hint pb16 center">${esc(t(lang, 'settings.snoozeHint'))}</div>` : '')) + `</div>`;
const settingsTop = (lang) => `<div class="row end"><div class="label acc">${esc(t(lang, 'common.done'))}</div></div>${display(t(lang, 'settings.title'))}<div class="mb28"></div>
      ${section(t(lang, 'settings.name'))}${card(`<div class="body py16">${esc(NAME[lang])}</div>`)}
      ${section(t(lang, 'settings.schedule'))}${card(row(t(lang, 'settings.notifStart'), '18:00') + row(t(lang, 'settings.alarmStart'), '21:00', { last: true }))}
      ${section(t(lang, 'settings.language'))}${card(`<div class="row gap10 py16">${chip('עברית', { active: lang === 'he' })}${chip('English', { active: lang === 'en' })}</div>`)}`;
const settingsBottom = (lang) => `${section(t(lang, 'settings.paused'))}${card(row(t(lang, 'settings.paused'), '', { right: sw(false), hint: t(lang, 'settings.pausedHint'), last: true }))}
      ${section(t(lang, 'settings.about'))}${card(row(t(lang, 'settings.tester')) + row(t(lang, 'settings.version', { v: '1.0.0' }), '1.0.2 · embedded', { last: true }))}`;
const soundSnooze = (lang, sel, playing, normalNote, snoozeOpen = false) => `${section(t(lang, 'settings.sound'))}${soundCard(lang, sel, playing, normalNote)}${section(t(lang, 'settings.snooze'))}${snoozeCard(lang, 5, snoozeOpen)}`;
const lockScreen = (lang, btn) => `<div class="lock"><div class="ltime">22:00</div><div class="lcard"><div class="lapp"><span class="licon"></span><span class="label">Take My Pill</span></div><div class="ltitle">${esc(t(lang, 'alarm.title'))}</div><div class="lbtn">${btn}</div><div class="lslide"><span>slide to stop</span></div></div></div>`;
const zzSmall = (size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7l-7 9h7"/><path d="M14 10h6l-6 8h6"/></svg>`;
const xIcon = (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 14 14"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const ring = (size, stroke) => { const r = (size - stroke) / 2; const c = 2 * Math.PI * r; return `<svg class="pring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#ffffff22" stroke-width="${stroke}"/><circle class="pringv" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E88A9A" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="0" data-c="${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`; };
const cd = (cls = '') => `<span class="cd ${cls}">4:59</span>`;
const laCard = (lang) => `<div class="la ${lang === 'he' ? 'rtl' : ''}"><div class="la-ring">${ring(64, 6)}<span class="la-zz">${zzSmall(22)}</span></div>
  <div class="la-mid"><div class="la-title">${esc(t(lang, 'la.title'))}</div><div class="la-sub">${esc(t(lang, 'la.ringsIn'))}</div></div>
  <div class="la-end">${cd('big')}<div class="la-stop" title="${esc(t(lang, 'la.stop'))}">${xIcon(14)}</div></div></div>`;
const island = (lang, kind) => {
  if (kind === 'compact') return `<div class="di compact"><span class="di-zz">${zzSmall(15)}</span><span class="di-cam"></span>${cd('small')}</div>`;
  if (kind === 'minimal') return `<div class="di-row"><div class="di compact half"><span class="di-cam"></span></div><div class="di minimal">${ring(26, 3.5)}</div></div>`;
  return `<div class="di expanded ${lang === 'he' ? 'rtl' : ''}"><div class="die-top"><div class="die-lead"><span class="di-zz">${zzSmall(20)}</span><div><div class="la-title s">${esc(t(lang, 'la.title'))}</div><div class="la-sub s">${esc(t(lang, 'la.ringsIn'))}</div></div></div>${cd('mid')}</div><div class="die-stop">${xIcon(12)}<span>${esc(t(lang, 'la.stop'))}</span></div></div>`;
};
const zzz = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-inline-end:8px"><path d="M4 6h7l-7 9h7"/><path d="M14 10h6l-6 8h6"/></svg>`;
const sw = (on, tone = 'accent') => `<div class="switch ${on ? 'on' : ''} ${tone}"><span></span></div>`;
const pill = (txt, tone) => `<div class="permpill ${tone}">${esc(txt)}</div>`;
const spinner = (h, m) => `<div class="spinner">${[-2, -1, 0, 1, 2].map((d) => `<div class="srow ${d === 0 ? 'cur' : ''}"><span>${String((h + d + 24) % 24).padStart(2, '0')}</span><span>${String(m).padStart(2, '0')}</span></div>`).join('')}</div>`;
const closeX = () => `<div class="closex"><svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>`;
const gear = () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;
const homeBottom = (lang, quietActive = false) => `<div class="row gap12 homebar"><div class="chip big accent ${quietActive ? 'active' : ''}">${esc(t(lang, 'home.quietTime'))}</div><div class="gearbtn">${gear()}</div></div>`;
const tookIt = (lang, taken) => `<div class="tookwrap"><div class="glow ${taken ? 'taken' : ''}"></div><div class="took ${taken ? 'taken' : ''}">${taken ? `<svg class="check" viewBox="0 0 96 96"><path d="M 22 50 L 42 70 L 76 30" fill="none" stroke="var(--successInk)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="label ink">${esc(t(lang, 'home.takenAt', { time: '22:14' }))}</div>` : `<div class="tooklabel ink">${esc(t(lang, 'home.tookIt'))}</div>`}</div></div>`;
const pencil = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/></svg>`;
const trash = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>`;
const quietItem = (lang, date, range, last = false) => `<div class="rrow ${last ? 'last' : ''}"><div class="row between"><div><div class="body">${esc(date)}</div><div class="numeral sec">${esc(range)}</div></div><div class="row gap12"><div class="iconbtn acc" title="${esc(t(lang, 'common.edit'))}">${pencil}</div><div class="iconbtn danger" title="${esc(t(lang, 'common.delete'))}">${trash}</div></div></div></div>`;

// ---------- screens ----------
const screens = [
  { id: 'onb-language', title: 'Onboarding 1 · Language', render: (lang) => `${progress(0)}${display(t(lang, 'onboarding.langTitle'))}${sub(t(lang, 'onboarding.langSubtitle'))}
      <div class="langgrid"><div class="langcard ${lang === 'he' ? 'active' : ''}"><div class="displaySmall center he ${lang === 'he' ? 'acc' : ''}">עברית</div></div><div class="langcard ${lang === 'en' ? 'active' : ''}"><div class="displaySmall center en ${lang === 'en' ? 'acc' : ''}">English</div></div></div>
      <div class="spacer"></div>${footer(lang, 0)}` },
  { id: 'onb-name', title: 'Onboarding 2 · Name', render: (lang) => `${progress(1)}${display(t(lang, 'onboarding.nameTitle'))}${sub(t(lang, 'onboarding.nameSubtitle'))}
      <div class="input displaySmall">${esc(NAME[lang])}<span class="caret"></span></div><div class="spacer"></div>${footer(lang, 1)}` },
  { id: 'onb-notif', title: 'Onboarding 3 · First reminder', render: (lang) => `${progress(2)}${display(t(lang, 'onboarding.notifTitle'))}${sub(t(lang, 'onboarding.notifSubtitle'))}
      ${card(row(t(lang, 'settings.notifStart'), '18:00') + spinner(18, 0))}<div class="caption ter center">${esc(t(lang, 'onboarding.recommended', { time: '18:00' }))}</div><div class="spacer"></div>${footer(lang, 2)}` },
  { id: 'onb-alarm', title: 'Onboarding 4 · First alarm', render: (lang) => `${progress(3)}${display(t(lang, 'onboarding.alarmTitle'))}${sub(t(lang, 'onboarding.alarmSubtitle'))}
      ${card(row(t(lang, 'settings.alarmStart'), '21:00') + spinner(21, 0))}<div class="caption ter center">${esc(t(lang, 'onboarding.recommended', { time: '21:00' }))}</div><div class="spacer"></div>${footer(lang, 3)}` },
  { id: 'onb-perm', title: 'Onboarding 5 · Permissions', render: (lang) => `${progress(4)}${display(t(lang, 'onboarding.permTitle'))}${sub('')}
      ${card(row(t(lang, 'onboarding.permAlarms'), '', { right: pill(t(lang, 'onboarding.allowed'), 'success') }) + row(t(lang, 'onboarding.permNotifications'), '', { right: pill(t(lang, 'onboarding.allow'), 'accent'), last: true }))}
      <div class="spacer"></div>${footer(lang, 4, true)}` },
  { id: 'home', title: 'Home · evening, next alarm', render: (lang) => `<div class="header">${display(t(lang, 'home.greetingEvening', { name: NAME[lang] }))}<div class="body alarmc mt8">${esc(t(lang, 'home.nextAlarm', { time: '22:00' }))}</div></div>
      <div class="center fill">${tookIt(lang, false)}</div>${homeBottom(lang)}` },
  { id: 'home-taken', title: 'Home · after "Took it!"', render: (lang) => `<div class="header">${display(t(lang, 'home.greetingNight', { name: NAME[lang] }))}<div class="body successc mt8">${esc(t(lang, 'home.allDone'))}</div></div>
      <div class="center fill">${tookIt(lang, true)}</div>${homeBottom(lang)}` },
  { id: 'home-quiet', title: 'Home · inside a quiet time', render: (lang) => `<div class="header">${display(t(lang, 'home.greetingEvening', { name: NAME[lang] }))}<div class="body sec mt8">${esc(t(lang, 'home.quietNow', { time: '00:30' }))}</div></div>
      <div class="center fill">${tookIt(lang, false)}</div>${homeBottom(lang, true)}` },
  { id: 'settings', title: 'NEW · Settings: Alarm sound (3 choices) + Snooze length. Tap the sound chips here - they really play (15s)', scroll: true, big: true, render: (lang) => `${settingsTop(lang)}${soundSnooze(lang, 'song', null, false)}${settingsBottom(lang)}` },
  { id: 'settings-playing', title: 'NEW · Settings: while "Gentle" is playing (scrolled to the sound section)', scroll: true, big: true, render: (lang) => `<div class="mb28"></div>${soundSnooze(lang, 'gentle', 'gentle', false)}${settingsBottom(lang)}` },
  { id: 'settings-snooze', title: 'NEW · Settings: Snooze length opened - scroll the wheel to any length from 1 to 20 min (scroll it here too)', scroll: true, big: true, render: (lang) => `<div class="mb28"></div>${soundSnooze(lang, 'song', null, false, true)}${settingsBottom(lang)}` },
  { id: 'settings-normal', title: 'NEW · Settings: after tapping "Normal" (no preview possible, a note explains why)', scroll: true, big: true, render: (lang) => `<div class="mb28"></div>${soundSnooze(lang, 'normal', null, true)}${settingsBottom(lang)}` },
  { id: 'quiet-list', title: 'NEW · Quiet times · list: pencil (edit) and trash (delete) icons instead of words', sheet: true, render: (lang) => `${closeX()}${display(t(lang, 'quiet.listTitle'))}<div class="body sec mb28 mt8">${esc(t(lang, 'quiet.hint'))}</div>
      ${card(quietItem(lang, lang === 'he' ? 'יום ו׳, 24 באוק׳' : 'Fri, 24 Oct', '23:00 – 00:30') + quietItem(lang, lang === 'he' ? 'יום ג׳, 28 באוק׳' : 'Tue, 28 Oct', '21:00 – 22:30', true))}
      <div class="spacer"></div>${button(t(lang, 'quiet.add'))}` },
  { id: 'quiet-edit', title: 'Quiet time · add / edit (sheet, one picker open at a time)', sheet: true, scroll: true, render: (lang) => `${closeX()}${display(t(lang, 'quiet.title'))}<div class="mb28"></div>
      ${card(row(t(lang, 'quiet.date'), lang === 'he' ? 'יום ו׳, 24 באוק׳' : 'Fri, 24 Oct') + row(t(lang, 'quiet.from'), '22:00') + spinner(22, 0) + row(t(lang, 'quiet.to'), '23:00', { last: true }))}
      <div class="caption ter center mb12">${esc(t(lang, 'quiet.crossesMidnight'))}</div>
      <div class="row gap12 mt8">${button(t(lang, 'common.cancel'), 'ghost')}${button(t(lang, 'common.save'))}</div>` },
  { id: 'tester-locked', title: 'Tester · password (sheet)', sheet: true, render: (lang) => `${closeX()}${display(t(lang, 'tester.title'))}<div class="mb28"></div>${card(`<div class="title center py18 pw">••••</div>`)}<div class="caption danger center mb12">${esc(t(lang, 'tester.wrong'))}</div>
      <div class="row gap12">${button(t(lang, 'common.cancel'), 'ghost')}${button(t(lang, 'tester.enter'))}</div>` },
  { id: 'tester-on', title: 'Tester · mode on (sheet)', sheet: true, render: (lang) => `${closeX()}${display(t(lang, 'tester.title'))}<div class="mb28"></div>
      ${card(row(t(lang, 'tester.toggle'), t(lang, 'tester.remaining', { min: 47 }), { right: sw(true, 'alarm'), hint: t(lang, 'tester.hint'), last: true }))}
      ${section('Debug')}${card(row(t(lang, 'tester.scheduled', { alarms: 24, banners: 23 })) + row(t(lang, 'tester.alarmAuth', { state: 'authorized' })) + row('Reconcile now') + row('Request alarm permission', '', { last: true }))}
      ${card(row(t(lang, 'tester.reset'), '', { danger: true, last: true }))}` },
  { id: 'lock-before', title: 'BEFORE · Lock screen alarm today (Open button)', lock: true, render: (lang) => lockScreen(lang, esc(t(lang, 'alarm.openButton'))) },
  { id: 'lock-after', title: 'NEW · Lock screen alarm with Snooze (rings again after the snooze length, app stays closed)', lock: true, render: (lang) => lockScreen(lang, zzz + esc(t(lang, 'alarm.snoozeButton'))) },
  { id: 'r4-lock', title: 'ROUND 4 · After Snooze: countdown on the lock screen (Live Activity, ticks live here)', lock: true, render: (lang) => `<div class="lock"><div class="ltime">22:00</div><div class="ldate">${lang === 'he' ? 'יום ראשון, 25 באוקטובר' : 'Sunday, October 25'}</div>${laCard(lang)}</div>` },
  { id: 'r4-island', title: 'ROUND 4 · Dynamic Island while snoozed: compact (top), expanded (long-press), minimal (with another app)', lock: true, render: (lang) => `<div class="home-screen">${island(lang, 'compact')}<div class="di-cap">compact</div>${island(lang, 'expanded')}<div class="di-cap">expanded</div>${island(lang, 'minimal')}<div class="di-cap">minimal</div></div>` },
  { id: 'r4-standby', title: 'ROUND 4 · StandBy (phone charging on its side)', lock: true, render: (lang) => `<div class="standby"><div class="sb-inner">${laCard(lang)}</div><div class="di-cap">StandBy shows the same card, large, rotated</div></div>` },
  { id: 'r4-banner', title: 'ROUND 4 · Alarm while the phone is unlocked: top banner with Stop (X) and Snooze (zz)', lock: true, render: (lang) => `<div class="home-screen"><div class="abanner ${lang === 'he' ? 'rtl' : ''}"><div class="ab-left"><span class="licon"></span><div><div class="ab-app">Take My Pill</div><div class="ab-title">${esc(t(lang, 'alarm.title'))}</div></div></div><div class="ab-btns"><div class="ab-btn x">${xIcon(14)}</div><div class="ab-btn zz">${zzSmall(18)}</div></div></div><div class="di-cap">${lang === 'he' ? 'לחיצה על zz = נודניק, בדיוק כמו בכפתור הגדול' : 'zz = Snooze, exactly like the big button'}</div></div>` },
  { id: 'r4-again', title: 'ROUND 4 · Countdown ends: the SAME alarm rings again, identical, with Snooze again', lock: true, render: (lang) => lockScreen(lang, zzz + esc(t(lang, 'alarm.snoozeButton'))).replace('22:00', '22:05') },
  { id: 'r4-home', title: 'ROUND 4 · App Home while snoozed', render: (lang) => `<div class="spacer"></div><div class="display center">${esc(lang === 'he' ? 'ערב טוב, ג׳יין' : 'Good evening, Jane')}</div><div class="body alarmc center mt8">${esc(t(lang, 'home.snoozed', { time: '22:05' }))}</div><div class="spacer"></div>${tookIt(lang, false)}<div class="spacer"></div>${homeBottom(lang)}` },
  { id: 'lockscreen', title: 'NEW · Lock screen banners: reminder text only, no "Took it" button', lock: true, render: (lang) => `<div class="lock"><div class="ltime">22:00</div>
      <div class="lbanner"><div class="row gap8"><span class="licon"></span><span class="label">${esc(t(lang, 'alarm.bannerTitle'))}</span></div><div class="body">${esc(t(lang, 'alarm.bannerBody'))}</div></div>
      <div class="lbanner"><div class="row gap8"><span class="licon"></span><span class="label">${esc(t(lang, 'alarm.tapToOpenTitle'))}</span></div><div class="body">${esc(t(lang, 'alarm.tapToOpenBody'))}</div></div></div>` },
];

// ---------- css ----------
const colors = (name) => ({ ...themes[name].colors, ...COLOR_OVERRIDES[name] });
const vars = (c) => Object.entries(c).map(([k, v]) => `--${k}: ${Array.isArray(v) ? v[0] : v}; ${Array.isArray(v) ? `--${k}2: ${v[1]};` : ''}`).join('\n');

const css = `
/* big-UI screens (settings) */
.big .body { font-size: 21px; line-height: 28px; }
.big .numeral { font-size: 21px; line-height: 28px; }
.big .caption { font-size: 15px; line-height: 20px; }
.big .label.section { font-size: 15px; margin-bottom: 14px; }
.big .rrow { padding: 24px 0; }
.big .card { padding: 6px 24px; margin-bottom: 32px; border-radius: 32px; }
.big .chip { min-height: 52px; font-size: 17px; padding: 12px 22px; }
.big .switch { width: 60px; height: 36px; } .big .switch span { width: 32px; height: 32px; } .big .switch.on span { left: 26px; }
.big .py16 { padding: 24px 0; }
.big .mb28 { margin-bottom: 36px; }

:root { ${vars(colors('dark'))} --heDisplay: 'Rubik'; --enDisplay: 'Rubik'; --devw: 440; --devh: 956; --scale: 0.72; }
:root[data-theme="light"] { ${vars(colors('light'))} }
* { box-sizing: border-box; }
body { margin: 0; background: #0b0a10; color: #ddd; font-family: Heebo, system-ui, sans-serif; }
.top { position: sticky; top: 0; z-index: 5; background: #0b0a10cc; backdrop-filter: blur(10px); padding: 12px 24px; display: flex; gap: 12px; align-items: center; border-bottom: 1px solid #222; flex-wrap: wrap; }
.top h1 { font: 600 18px Fraunces, serif; margin: 0; flex: 1; }
.top button, .top label, .top select { background: #1E1A29; color: #eee; border: 1px solid #333; border-radius: 999px; padding: 8px 14px; cursor: pointer; font: 500 13px Heebo; }
.top button.primary { background: var(--accent); color: var(--accentInk); border-color: transparent; }
.grid { padding: 24px; display: flex; flex-direction: column; gap: 40px; }
.shot { display: grid; grid-template-columns: auto auto 1fr; gap: 20px; align-items: start; }
.shot h2 { grid-column: 1 / -1; margin: 0 0 -8px; font: 500 15px Heebo; color: #aaa; }
/* true-scale device: content is laid out at --devw pt and scaled uniformly */
.frame { width: calc(var(--devw) * 1px * var(--scale)); height: calc(var(--devh) * 1px * var(--scale)); border-radius: calc(55px * var(--scale)); overflow: hidden; background: var(--background); border: 5px solid #1a1822; box-shadow: 0 20px 60px #0008; position: relative; }
.frame .lang { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); font: 500 10px Heebo; color: #666; letter-spacing: 1px; z-index: 2; }
.device { position: absolute; top: 0; left: 0; width: calc(var(--devw) * 1px); height: calc(var(--devh) * 1px); transform: scale(var(--scale)); transform-origin: top left; }
.screen { position: absolute; inset: 0; padding: 62px 20px 40px; display: flex; flex-direction: column; color: var(--textPrimary); }
.screen.scroll { overflow-y: auto; } .screen.scroll::-webkit-scrollbar { width: 0; }
.rtl { direction: rtl; }
.rtl .display, .rtl .displaySmall, .rtl .tooklabel, .he { font-family: var(--heDisplay), serif; letter-spacing: 0; }
.en { font-family: var(--enDisplay), sans-serif; }
/* type scales from screen width: display = width * 0.085, clamped 32..40 */
.display { font: 600 clamp(32px, calc(var(--devw) * 0.085px), 40px) / 1.15 var(--enDisplay), sans-serif; letter-spacing: -0.3px; }
.displaySmall { font: 600 28px/34px var(--enDisplay), sans-serif; letter-spacing: -0.2px; }
.tooklabel { font: 600 calc(var(--devw) * 0.095px) / 1.1 var(--enDisplay), sans-serif; letter-spacing: -0.3px; text-align: center; }
.title { font: 600 20px/26px Heebo; }
.body { font: 400 17px/24px Heebo; }
.caption { font: 400 13px/18px Heebo; }
.label { font: 500 14px/18px Heebo; letter-spacing: 0.2px; }
.numeral { font: 500 17px/22px Heebo; font-variant-numeric: tabular-nums; direction: ltr; }
.sec { color: var(--textSecondary); } .ter { color: var(--textTertiary); } .acc { color: var(--accent); } .danger { color: var(--danger); }
.alarmc { color: var(--alarm); } .successc { color: var(--success); } .ink { color: var(--accentInk); } .taken .ink { color: var(--successInk); }
.center { text-align: center; align-items: center; justify-content: center; }
.row { display: flex; align-items: center; } .between { justify-content: space-between; } .end { justify-content: flex-end; }
.gap8 { gap: 8px; } .gap10 { gap: 10px; } .gap12 { gap: 12px; } .gap16 { gap: 16px; }
.mt8 { margin-top: 8px; } .mb12 { margin-bottom: 12px; } .mb28 { margin-bottom: 28px; } .py16 { padding: 16px 0; } .py18 { padding: 18px 0; }
.sub { margin: 10px 0 28px; }
.spacer { flex: 1; } .fill { flex: 1; display: flex; }
.progress { display: flex; gap: 6px; margin-bottom: 32px; }
.pseg { flex: 1; height: 4px; border-radius: 2px; background: var(--surfaceRaised); } .pseg.on { background: var(--accent); }
.btn { flex: none; min-height: 56px; border-radius: 999px; display: flex; align-items: center; justify-content: center; font: 600 17px Heebo; }
.row > .btn { flex: 1; } .row > .btn.primary { flex: 2; }
.btn.primary { background: linear-gradient(135deg, var(--accentGradient), var(--accentGradient2)); color: var(--accentInk); }
.btn.secondary { background: var(--surfaceRaised); color: var(--textPrimary); }
.btn.ghost { color: var(--accent); }
.footer { padding-top: 12px; }
.card { background: var(--surface); border-radius: 28px; padding: 4px 20px; margin-bottom: 24px; }
.section { margin: 0 4px 10px; }
.rrow { padding: 16px 0; border-bottom: 1px solid var(--hairline); } .rrow.last { border-bottom: 0; }
.rrow .row { gap: 12px; } .rrow .body { flex: 1; }
.hint { margin-top: 6px; }
.chip { min-height: 44px; padding: 10px 16px; border-radius: 999px; border: 1px solid transparent; background: var(--surfaceRaised); color: var(--textSecondary); font: 500 15px Heebo; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.chip.active.accent { background: var(--accentSoft); border-color: var(--accent); color: var(--accent); }
.chip.big { flex: 1; min-height: 56px; font-size: 16px; font-weight: 600; border-color: var(--accent); color: var(--accent); background: transparent; }
.chip.big.active { background: var(--accentSoft); }
.homebar { padding-top: 8px; }
.gearbtn { width: 56px; height: 56px; border-radius: 999px; background: var(--surfaceRaised); color: var(--textSecondary); display: flex; align-items: center; justify-content: center; }
.switch { width: 51px; height: 31px; border-radius: 16px; background: var(--surfaceRaised); position: relative; flex: none; } .switch span { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 14px; background: #fff; }
.switch.on { background: var(--accent); } .switch.on.alarm { background: var(--alarm); } .switch.on span { left: 22px; }
.permpill { padding: 8px 14px; border-radius: 999px; font: 500 14px Heebo; } .permpill.success { background: var(--successSoft); color: var(--success); } .permpill.accent { background: var(--accentSoft); color: var(--accent); }
.langgrid { display: flex; flex-direction: column; gap: 14px; }
.langcard { padding: 30px; border-radius: 28px; background: var(--surface); border: 1.5px solid transparent; } .langcard.active { border-color: var(--accent); }
.input { border-bottom: 2px solid var(--accent); padding: 10px 0; } .caret { display: inline-block; width: 2px; height: 26px; background: var(--accent); margin: 0 2px -4px; }
.spinner { padding: 6px 0 10px; } .srow { direction: ltr; display: flex; justify-content: center; gap: 28px; padding: 6px 0; color: var(--textTertiary); font: 400 21px Heebo; font-variant-numeric: tabular-nums; } .srow.cur { color: var(--textPrimary); font-weight: 500; font-size: 24px; background: var(--surfaceRaised); border-radius: 10px; }
.pw { letter-spacing: 6px; }
.ldate { text-align: center; color: #fffc; font: 500 18px -apple-system, Heebo; margin: -6px 0 18px; }
.la { display: flex; align-items: center; gap: 14px; background: #15121D; border-radius: 26px; padding: 16px 18px; color: #F5F1F7; font-family: ui-rounded, 'SF Pro Rounded', Rubik, Heebo, sans-serif; box-shadow: 0 0 0 1px #E88A9A33; }
.la-ring { position: relative; width: 64px; height: 64px; flex: none; } .la-zz { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #E88A9A; }
.la-mid { flex: 1; } .la-title { font-weight: 700; font-size: 19px; } .la-sub { color: #A79FB8; font-size: 14px; margin-top: 2px; }
.la-title.s { font-size: 16px; } .la-sub.s { font-size: 12px; }
.la-end { display: flex; align-items: center; gap: 12px; }
.cd { font-variant-numeric: tabular-nums; font-weight: 700; color: #E88A9A; direction: ltr; unicode-bidi: isolate; }
.cd.big { font-size: 34px; } .cd.mid { font-size: 28px; } .cd.small { font-size: 14px; }
.la-stop { width: 36px; height: 36px; border-radius: 18px; background: #ffffff1f; display: flex; align-items: center; justify-content: center; color: #F5F1F7; }
.home-screen { position: absolute; inset: 0; background: radial-gradient(circle at 30% 20%, #6b4f8a, #1c1726 60%); padding: 14px 16px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.di { background: #000; color: #fff; border-radius: 999px; display: flex; align-items: center; font-family: ui-rounded, 'SF Pro Rounded', Rubik, sans-serif; }
.di.compact { height: 37px; width: 250px; padding: 0 14px; justify-content: space-between; } .di.compact.half { width: 126px; justify-content: center; }
.di-cam { width: 12px; height: 12px; border-radius: 6px; background: #1b1b22; }
.di-zz { color: #E88A9A; display: inline-flex; }
.di-row { display: flex; gap: 8px; align-items: center; } .di.minimal { width: 37px; height: 37px; justify-content: center; }
.di.expanded { flex-direction: column; align-items: stretch; border-radius: 44px; width: 390px; padding: 18px 22px 16px; gap: 14px; margin-top: 18px; }
.die-top { display: flex; justify-content: space-between; align-items: center; } .die-lead { display: flex; gap: 10px; align-items: center; }
.die-stop { align-self: center; display: flex; gap: 8px; align-items: center; background: #ffffff1f; border-radius: 999px; padding: 10px 26px; font-weight: 600; font-size: 15px; }
.di-cap { color: #ffffff88; font: 500 12px Heebo; margin-bottom: 18px; }
.standby { position: absolute; inset: 0; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.sb-inner { transform: rotate(90deg) scale(1.15); width: 400px; }
.abanner { width: 100%; background: #1f1b29ee; border-radius: 30px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; margin-top: 6px; color: #fff; backdrop-filter: blur(20px); }
.ab-left { display: flex; gap: 10px; align-items: center; } .ab-app { color: #fff9; font: 500 12px -apple-system, Heebo; } .ab-title { font: 600 16px -apple-system, Heebo; }
.ab-btns { display: flex; gap: 10px; } .ab-btn { width: 46px; height: 46px; border-radius: 23px; display: flex; align-items: center; justify-content: center; }
.ab-btn.x { background: #ffffff26; } .ab-btn.zz { background: #E88A9A; color: #fff; }
.iconbtn { width: 44px; height: 44px; border-radius: 22px; display: flex; align-items: center; justify-content: center; background: var(--surfaceRaised); } .iconbtn.acc { background: var(--accentSoft); } .iconbtn.danger { background: rgba(240,154,154,0.14); }
.wrap { flex-wrap: wrap; } .pb16 { padding-bottom: 18px; margin-top: -6px; }
.chip.snd, .snzwheel .srow { cursor: pointer; user-select: none; }
.rtl .snzwheel .srow, .rtl .snzcard .numeral { direction: rtl; }
.eq { display: inline-flex; gap: 3px; align-items: flex-end; height: 16px; } .eq i { width: 3px; background: currentColor; border-radius: 2px; animation: eq .9s ease-in-out infinite; } .eq i:nth-child(2) { animation-delay: .15s; } .eq i:nth-child(3) { animation-delay: .3s; }
@keyframes eq { 0%,100% { height: 4px; } 50% { height: 16px; } }
.whatsnew { margin: 20px 24px 0; padding: 16px 20px; background: #1E1A29; border-radius: 16px; color: #ccc; font: 400 14px/1.6 Heebo; } .whatsnew b { color: #fff; } .whatsnew ul { margin: 6px 0 0; padding-left: 20px; }
.header { margin-top: 8px; }
/* hero button: 62% of screen width, 232..300 */
.tookwrap { --s: clamp(260px, calc(var(--devw) * 0.72px), 330px); width: var(--s); height: var(--s); position: relative; display: flex; align-items: center; justify-content: center; margin: auto; }
.glow { position: absolute; width: calc(var(--s) - 24px); height: calc(var(--s) - 24px); border-radius: 50%; background: var(--accent); filter: blur(40px); opacity: 0.55; transform: translateY(14px); } .glow.taken { background: var(--success); }
.took { position: absolute; width: var(--s); height: var(--s); border-radius: 50%; background: linear-gradient(135deg, var(--accentGradient), var(--accentGradient2)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 0 24px; }
.took.taken { background: var(--success); } .check { width: calc(var(--s) * 0.42); height: calc(var(--s) * 0.42); }
.closex { position: absolute; top: 34px; inset-inline-end: 24px; width: 30px; height: 30px; border-radius: 15px; background: var(--surfaceRaised); color: var(--textSecondary); display: flex; align-items: center; justify-content: center; }
.screen.sheet { padding-top: 44px; }
.sheet .display { margin-top: 28px; }
.lock { position: absolute; inset: 0; background: linear-gradient(180deg, #2b2340, #15121D); padding: 70px 16px; display: flex; flex-direction: column; gap: 12px; color: #fff; }
.ltime { font: 200 88px/1 -apple-system, Heebo; text-align: center; margin-bottom: 10px; }
.lcard { background: #ffffff18; border-radius: 28px; padding: 18px; display: flex; flex-direction: column; gap: 14px; backdrop-filter: blur(20px); }
.lapp { display: flex; align-items: center; gap: 8px; color: #fff9; } .licon { width: 18px; height: 18px; border-radius: 5px; background: #E2288C; display: inline-block; }
.ltitle { font: 600 28px/34px -apple-system, Heebo; }
.lbtn { background: var(--accent); color: #fff; border-radius: 999px; padding: 15px; text-align: center; font: 600 17px Heebo; }
.lslide { background: #ffffff22; border-radius: 999px; padding: 15px; text-align: center; color: #fffa; font: 500 15px Heebo; }
.lbanner { background: #ffffff18; border-radius: 22px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; backdrop-filter: blur(20px); }
.notes { display: flex; flex-direction: column; gap: 8px; position: sticky; top: 90px; }
.notes textarea { width: 100%; min-height: 220px; background: #14121c; color: #eee; border: 1px solid #2a2735; border-radius: 14px; padding: 12px; font: 400 14px/1.5 Heebo; resize: vertical; }
.notes .hintt { color: #666; font-size: 12px; }
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--success); color: var(--successInk); padding: 10px 18px; border-radius: 999px; font: 500 14px Heebo; opacity: 0; transition: opacity .2s; }
.toast.show { opacity: 1; }
`;

const frame = (s, lang) => `<div class="frame"><div class="lang">${lang.toUpperCase()}</div><div class="device"><div class="screen ${lang === 'he' ? 'rtl' : ''} ${s.scroll ? 'scroll' : ''} ${s.sheet ? 'sheet' : ''} ${s.big ? 'big' : ''}">${s.render(lang)}</div></div></div>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Take My Pill · screen review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Heebo:wght@400;500;600;700&family=Rubik:wght@500;600&family=Lora:wght@600&family=DM+Serif+Display&family=Nunito:wght@700&family=Outfit:wght@600&family=Manrope:wght@700&family=Secular+One&family=Suez+One&family=David+Libre:wght@500;700&family=Noto+Serif+Hebrew:wght@500;600&family=Assistant:wght@600;700&family=Frank+Ruhl+Libre:wght@600&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="top">
  <h1>Take My Pill · screen review · round 4 (snooze countdown)</h1>
  <select id="device"><option value="440x956">iPhone Pro Max · 440×956</option><option value="402x874">iPhone 17 / Pro · 402×874</option><option value="390x844">iPhone 15 / 16 · 390×844</option></select>
  <select id="enfont"><option value="Rubik">English headers: Rubik (my pick, matches Hebrew)</option><option value="Manrope">English headers: Manrope</option><option value="Outfit">English headers: Outfit</option><option value="Nunito">English headers: Nunito (rounded)</option><option value="Lora">English headers: Lora (soft serif)</option><option value="DM Serif Display">English headers: DM Serif Display</option><option value="Fraunces">English headers: Fraunces (old)</option></select>
  <select id="hefont"><option value="Rubik">Hebrew headers: Rubik (my pick)</option><option value="Assistant">Hebrew headers: Assistant</option><option value="Secular One">Hebrew headers: Secular One</option><option value="Suez One">Hebrew headers: Suez One</option><option value="David Libre">Hebrew headers: David Libre</option><option value="Noto Serif Hebrew">Hebrew headers: Noto Serif Hebrew</option><option value="Frank Ruhl Libre">Hebrew headers: Frank Ruhl Libre (old)</option></select>
  <label><input type="checkbox" id="theme"> Light mode</label>
  <button id="clear">Clear notes</button>
  <button class="primary" id="copy">Copy all notes</button>
</div>
<div class="whatsnew"><b>Round 4 - Apple-style snooze (the ROUND 4 screens below)</b><ul>
<li>Tap Snooze: the alarm turns into a live countdown on the lock screen, the Dynamic Island and StandBy, in the app's colors and words.</li>
<li>Stop (X) on the countdown ends the snooze. "Took it" in the app also ends it.</li>
<li>When the countdown ends, the SAME alarm rings again, identical, with Snooze again.</li>
<li>Phone unlocked: the alarm's top banner shows X and zz (Snooze). Font in the countdown: Apple's rounded font.</li></ul>
<b>Round 3 (already in the app)</b><ul>
<li>Alarm sound gets 3 choices, in this order: Normal (the iPhone's own alarm) · Song (stays the default, today's sound) · Gentle (the original tone, now at alarm volume).</li>
<li>Tapping a sound plays a 15-second preview. Tapping the same one again stops it. Tapping another one switches to it. Normal can't be previewed - iPhone blocks apps from playing it.</li>
<li>New "Snooze length" section: any length from 1 to 20 minutes on a scroll wheel (default 5). Tap the row to open it, like the time pickers.</li>
<li>The alarm's "Open" button becomes "Snooze" / "נודניק". Stop stays as it is.</li>
<li>Reminder banners lose the "Took it ✓" button - banner text only.</li>
<li>Quiet times list: pencil and trash icons replace the words Edit / Delete.</li>
<li>Ships as a new TestFlight build (new sound file + native snooze).</li></ul></div>
<div class="grid">
${screens.map((s) => `<div class="shot" id="${s.id}" data-id="${s.id}"><h2>${esc(s.title)}</h2>${frame(s, 'en')}${frame(s, 'he')}<div class="notes"><textarea placeholder="Notes for this screen…" data-note="${s.id}"></textarea><div class="hintt">Saved automatically. "Copy all notes" collects every box into one text.</div></div></div>`).join('\n')}
</div>
<div class="toast" id="toast">Copied</div>
<script>
const areas = [...document.querySelectorAll('textarea[data-note]')];
for (const a of areas) { try { a.value = localStorage.getItem('note2:' + a.dataset.note) || ''; } catch {} a.addEventListener('input', () => { try { localStorage.setItem('note2:' + a.dataset.note, a.value); } catch {} }); }
document.getElementById('copy').onclick = async () => {
    const extras = 'English header font: ' + document.getElementById('enfont').value + '\\n' + 'Hebrew header font: ' + document.getElementById('hefont').value + '\\n\\n';
  const out = extras + areas.filter(a => a.value.trim()).map(a => '## ' + a.closest('.shot').querySelector('h2').textContent + '\\n' + a.value.trim()).join('\\n\\n');
  try { await navigator.clipboard.writeText(out); } catch { const ta = document.createElement('textarea'); ta.value = out; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  const t = document.getElementById('toast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1400);
};
document.getElementById('clear').onclick = () => { if (!confirm('Clear all notes?')) return; for (const a of areas) { a.value = ''; try { localStorage.removeItem('note2:' + a.dataset.note); } catch {} } };
const audio = { song: new Audio('sounds/song-preview.m4a'), gentle: new Audio('sounds/gentle-preview.m4a') };
let playing = null, current = null;
const stopAll = () => { for (const a of Object.values(audio)) { a.pause(); a.currentTime = 0; } playing = null; };
const paint = () => document.querySelectorAll('#settings .frame').forEach((f) => f.querySelectorAll('.chip.snd').forEach((c) => {
  const on = f === current && playing === c.dataset.snd; const eqEl = c.querySelector('.eq');
  c.classList.toggle('playing', on);
  if (on && !eqEl) c.insertAdjacentHTML('afterbegin', '<span class="eq"><i></i><i></i><i></i></span>');
  if (!on && eqEl) eqEl.remove();
}));
for (const a of Object.values(audio)) a.addEventListener('ended', () => { stopAll(); paint(); });
document.querySelectorAll('#settings .chip.snd').forEach((c) => c.addEventListener('click', () => {
  const f = c.closest('.frame'); const id = c.dataset.snd; const wasPlaying = current === f && playing === id;
  stopAll(); current = f;
  f.querySelectorAll('.chip.snd').forEach((x) => x.classList.toggle('active', x === c));
  f.querySelector('.normalnote').hidden = id !== 'normal';
  if (!wasPlaying && audio[id]) { audio[id].play(); playing = id; }
  paint();
}));
const SNZ = { en: (n) => n + ' min', he: (n) => n + ' דק׳' };
document.querySelectorAll('.snzwheel').forEach((w) => {
  const lang = w.closest('.screen').classList.contains('rtl') ? 'he' : 'en';
  let sel = +w.dataset.sel;
  const draw = () => { [...w.children].forEach((r, i) => { const n = sel + i - 2; r.firstElementChild.innerHTML = n >= 1 && n <= 20 ? SNZ[lang](n) : '&nbsp;'; });
    const v = w.closest('.card').querySelector('.numeral'); if (v) v.textContent = SNZ[lang](sel); };
  w.addEventListener('wheel', (e) => { e.preventDefault(); sel = Math.min(20, Math.max(1, sel + (e.deltaY > 0 ? 1 : -1))); draw(); }, { passive: false });
  [...w.children].forEach((r, i) => r.addEventListener('click', () => { sel = Math.min(20, Math.max(1, sel + i - 2)); draw(); }));
});
(() => { const total = 300; let left = 299;
  const fmt = (n) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  setInterval(() => { left = left <= 0 ? total : left - 1;
    document.querySelectorAll('.cd').forEach((e) => (e.textContent = fmt(left)));
    document.querySelectorAll('.pringv').forEach((e) => e.setAttribute('stroke-dashoffset', String(+e.dataset.c * (1 - left / total))));
  }, 1000); })();
document.getElementById('theme').onchange = (e) => document.documentElement.dataset.theme = e.target.checked ? 'light' : '';
document.getElementById('device').onchange = (e) => { const [w, h] = e.target.value.split('x'); document.documentElement.style.setProperty('--devw', w); document.documentElement.style.setProperty('--devh', h); };
document.getElementById('enfont').onchange = (e) => document.documentElement.style.setProperty('--enDisplay', "'" + e.target.value + "'");
document.getElementById('hefont').onchange = (e) => document.documentElement.style.setProperty('--heDisplay', "'" + e.target.value + "'");
</script>
</body>
</html>`;

writeFileSync(join(__dirname, 'index.html'), html);
console.log('wrote review/index.html with', screens.length, 'screens x 2 languages');

import {
  buildSlots,
  buildCycleSlots,
  buildTesterSlots,
  cycleKeyFor,
  isInQuietTime,
  isValidSchedule,
  parseSlotId,
  slotId,
  type QuietTime,
  type ScheduleInput,
} from '../src/engine';

const local = (y: number, mo: number, d: number, h: number, mi = 0, sec = 0) => new Date(y, mo - 1, d, h, mi, sec, 0);

const base = (now: Date, extra: Partial<ScheduleInput> = {}): ScheduleInput => ({
  now,
  notifStart: { h: 18, m: 0 },
  alarmStart: { h: 21, m: 0 },
  paused: false,
  takenOn: null,
  quietTimes: [],
  testerFrom: null,
  testerUntil: null,
  ...extra,
});

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('cycleKeyFor', () => {
  it('belongs to yesterday before 04:00', () => {
    expect(cycleKeyFor(local(2026, 10, 22, 1, 30))).toBe('2026-10-21');
    expect(cycleKeyFor(local(2026, 10, 22, 3, 59))).toBe('2026-10-21');
  });
  it('belongs to today from 04:00', () => {
    expect(cycleKeyFor(local(2026, 10, 22, 4, 0))).toBe('2026-10-22');
    expect(cycleKeyFor(local(2026, 10, 22, 15, 0))).toBe('2026-10-22');
    expect(cycleKeyFor(local(2026, 10, 22, 23, 0))).toBe('2026-10-22');
  });
});

describe('buildCycleSlots', () => {
  it('produces hourly banners then alarm/banner pairs until 04:00', () => {
    const slots = buildCycleSlots('2026-10-21', { h: 18, m: 0 }, { h: 21, m: 0 });
    const desc = slots.map((s) => `${s.kind[0]}${hhmm(s.fireAt)}`);
    expect(desc).toEqual([
      'b18:00', 'b19:00', 'b20:00',
      'a21:00', 'b21:30', 'a22:00', 'b22:30', 'a23:00', 'b23:30',
      'a00:00', 'b00:30', 'a01:00', 'b01:30', 'a02:00', 'b02:30', 'a03:00', 'b03:30',
    ]);
    expect(slots.filter((s) => s.kind === 'alarm')).toHaveLength(7);
    expect(slots.filter((s) => s.kind === 'banner')).toHaveLength(10);
  });

  it('skips the banner phase when the times are inverted', () => {
    const slots = buildCycleSlots('2026-10-21', { h: 22, m: 0 }, { h: 21, m: 0 });
    expect(slots[0].kind).toBe('alarm');
    expect(hhmm(slots[0].fireAt)).toBe('21:00');
  });
});

describe('buildSlots', () => {
  it('before 18:00 returns today and tomorrow in full', () => {
    const slots = buildSlots(base(local(2026, 10, 21, 15, 0)));
    expect(slots).toHaveLength(34);
    expect(slots[0].cycleKey).toBe('2026-10-21');
    expect(slots[slots.length - 1].cycleKey).toBe('2026-10-22');
  });

  it('drops passed slots', () => {
    const slots = buildSlots(base(local(2026, 10, 21, 22, 10)));
    const today = slots.filter((s) => s.cycleKey === '2026-10-21');
    expect(hhmm(today[0].fireAt)).toBe('22:30');
    expect(today[0].kind).toBe('banner');
  });

  it('after midnight still belongs to yesterday and tops up tomorrow', () => {
    const slots = buildSlots(base(local(2026, 10, 22, 1, 15)));
    const keys = new Set(slots.map((s) => s.cycleKey));
    expect(keys).toEqual(new Set(['2026-10-21', '2026-10-22']));
    const tonight = slots.filter((s) => s.cycleKey === '2026-10-21').map((s) => hhmm(s.fireAt));
    expect(tonight).toEqual(['01:30', '02:00', '02:30', '03:00', '03:30']);
  });

  it('removes tonight when taken, keeps tomorrow', () => {
    const slots = buildSlots(base(local(2026, 10, 21, 22, 10), { takenOn: '2026-10-21' }));
    expect(slots.every((s) => s.cycleKey === '2026-10-22')).toBe(true);
    expect(slots).toHaveLength(17);
  });

  it('took it before the cycle starts counts for tonight', () => {
    const slots = buildSlots(base(local(2026, 10, 21, 12, 0), { takenOn: '2026-10-21' }));
    expect(slots.every((s) => s.cycleKey === '2026-10-22')).toBe(true);
  });

  it('paused returns nothing', () => {
    expect(buildSlots(base(local(2026, 10, 21, 22, 0), { paused: true }))).toEqual([]);
  });

  it('quiet window crossing midnight removes the right slots', () => {
    const quiet: QuietTime = { id: 'q1', dateKey: '2026-10-21', from: { h: 23, m: 30 }, to: { h: 0, m: 30 } };
    const slots = buildSlots(base(local(2026, 10, 21, 22, 10), { quietTimes: [quiet] }));
    const tonight = slots.filter((s) => s.cycleKey === '2026-10-21').map((s) => hhmm(s.fireAt));
    expect(tonight).toEqual(['22:30', '23:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30']);
    expect(isInQuietTime(local(2026, 10, 22, 0, 0), [quiet])).toBe(true);
    expect(isInQuietTime(local(2026, 10, 22, 0, 30), [quiet])).toBe(false);
  });

  it('tester mode replaces everything with alternating minute slots', () => {
    const from = local(2026, 10, 21, 20, 0).getTime();
    const until = from + 60 * 60_000;
    const slots = buildSlots(base(local(2026, 10, 21, 20, 0, 30), { testerFrom: from, testerUntil: until, paused: true }));
    expect(slots).toHaveLength(60);
    expect(slots[0].kind).toBe('alarm');
    expect(hhmm(slots[0].fireAt)).toBe('20:01');
    expect(slots[1].kind).toBe('banner');
    expect(hhmm(slots[59].fireAt)).toBe('21:00');
    expect(slots.filter((s) => s.kind === 'alarm')).toHaveLength(30);
  });

  it('tester mode only returns future slots and expires', () => {
    const from = local(2026, 10, 21, 20, 0).getTime();
    const until = from + 60 * 60_000;
    const mid = buildTesterSlots(from, until, local(2026, 10, 21, 20, 30, 10));
    expect(hhmm(mid[0].fireAt)).toBe('20:31');
    const after = buildSlots(base(local(2026, 10, 21, 21, 1), { testerFrom: from, testerUntil: until }));
    // tester expired → normal schedule resumes (21:30 banner is next since 21:00 alarm has passed)
    expect(hhmm(after[0].fireAt)).toBe('21:30');
  });

  it('is stable across DST changes (Israel autumn change 2026-10-25)', () => {
    const slots = buildCycleSlots('2026-10-24', { h: 18, m: 0 }, { h: 21, m: 0 });
    const last = slots[slots.length - 1];
    expect(hhmm(last.fireAt)).toBe('03:30');
    expect(last.fireAt.getDate()).toBe(25);
  });
});

describe('slot ids', () => {
  it('are deterministic, uuid-shaped and reversible', () => {
    const at = local(2026, 10, 21, 22, 30);
    const id = slotId('alarm', at);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(slotId('alarm', new Date(at))).toBe(id);
    expect(slotId('banner', at)).not.toBe(id);
    const parsed = parseSlotId(id)!;
    expect(parsed.kind).toBe('alarm');
    expect(parsed.fireAt.getTime()).toBe(at.getTime());
    expect(parseSlotId('not-an-id')).toBeNull();
  });
});

describe('isValidSchedule', () => {
  it('requires reminder before alarm', () => {
    expect(isValidSchedule({ h: 18, m: 0 }, { h: 21, m: 0 })).toBe(true);
    expect(isValidSchedule({ h: 21, m: 0 }, { h: 21, m: 0 })).toBe(false);
    expect(isValidSchedule({ h: 22, m: 0 }, { h: 21, m: 0 })).toBe(false);
  });
});

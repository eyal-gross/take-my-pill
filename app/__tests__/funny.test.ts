import { funnyLineCount, pickFunnyLine, tierForHoursIntoNight } from '../src/i18n/funny';

describe('funny reminder lines', () => {
  it('escalates through the night', () => {
    expect(tierForHoursIntoNight(0)).toBe('early');
    expect(tierForHoursIntoNight(2.5)).toBe('early');
    expect(tierForHoursIntoNight(3)).toBe('mid');
    expect(tierForHoursIntoNight(5.5)).toBe('mid');
    expect(tierForHoursIntoNight(6)).toBe('late');
    expect(tierForHoursIntoNight(9.5)).toBe('late');
  });

  it('is deterministic per slot and varies across slots', () => {
    const a = pickFunnyLine('he', 'mid', 'slot-1', 'ג׳יין');
    expect(pickFunnyLine('he', 'mid', 'slot-1', 'ג׳יין')).toBe(a);
    const picks = new Set(Array.from({ length: 12 }, (_, i) => pickFunnyLine('he', 'mid', `slot-${i}`, 'ג׳יין')));
    expect(picks.size).toBeGreaterThan(4);
  });

  it('fills the name and has a fallback', () => {
    expect(pickFunnyLine('en', 'late', 'x', 'Jane')).not.toContain('{name}');
    expect(pickFunnyLine('en', 'late', 'x', '')).not.toContain('{name}');
    expect(pickFunnyLine('he', 'early', 'y', '')).not.toContain('{name}');
  });

  it('has a healthy pool in both languages', () => {
    expect(funnyLineCount('he')).toBeGreaterThanOrEqual(30);
    expect(funnyLineCount('en')).toBeGreaterThanOrEqual(30);
  });
});

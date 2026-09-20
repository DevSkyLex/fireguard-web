import { formatDurationMinutes } from '../duration-format.utils';
describe('formatDurationMinutes', () => {
  it('does not equate an absent estimate with zero', () => {
    expect(formatDurationMinutes(null)).toBe('—');
    expect(formatDurationMinutes(undefined)).toBe('—');
    expect(formatDurationMinutes(0)).toBe('0 min');
  });
  it('formats complete hours and minute remainders', () => {
    expect(formatDurationMinutes(60)).toBe('1 h');
    expect(formatDurationMinutes(125)).toBe('2 h 5 min');
    expect(formatDurationMinutes(45)).toBe('45 min');
  });
  it('refuses negative, fractional and non-finite input', () => {
    for (const value of [-1, 59.9, NaN, Infinity]) expect(formatDurationMinutes(value)).toBe('—');
  });
});

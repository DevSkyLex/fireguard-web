import { deriveInitials } from '../initials.utils';

describe('deriveInitials', () => {
  it('takes the first two letters of a single word', () => {
    expect(deriveInitials('Fireguard')).toBe('FI');
  });

  it('takes the first letter of each of the first two words', () => {
    expect(deriveInitials('Ella Uzer')).toBe('EU');
  });

  it('ignores extra whitespace between and around words', () => {
    expect(deriveInitials('  Ella   Uzer  ')).toBe('EU');
  });

  it('ignores extra words beyond the first two', () => {
    expect(deriveInitials('Ella Marie Uzer')).toBe('EM');
  });

  it('returns an empty string for a blank label', () => {
    expect(deriveInitials('')).toBe('');
    expect(deriveInitials('   ')).toBe('');
  });

  it('uppercases non-latin letters the same way', () => {
    expect(deriveInitials('émile dupont')).toBe('ÉD');
  });
});

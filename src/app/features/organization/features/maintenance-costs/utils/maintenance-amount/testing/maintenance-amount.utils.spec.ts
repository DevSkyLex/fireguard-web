import { formatMaintenanceAmount, isMaintenanceAmount } from '../maintenance-amount.utils';

describe('exact maintenance amounts', () => {
  it('preserves integers beyond floating precision and all six decimal places', () => {
    expect(formatMaintenanceAmount('9007199254740993.123456', 'EUR', 'en-US')).toBe(
      '9,007,199,254,740,993.123456 EUR',
    );
    expect(formatMaintenanceAmount('-0.000001', 'USD', 'en-US')).toBe('−0.000001 USD');
  });
  it('distinguishes explicit zero from unknown and retains its six places', () => {
    expect(formatMaintenanceAmount('0', 'EUR', 'en-US')).toBe('0.000000 EUR');
    expect(formatMaintenanceAmount(null, 'EUR', 'en-US')).toBe('Unknown');
    expect(formatMaintenanceAmount(undefined, 'EUR', 'en-US')).toBe('Unknown');
    expect(formatMaintenanceAmount('1e9', 'EUR', 'en-US')).toBe('Unknown');
  });
  it('uses the locale separators without converting the decimal to a number', () => {
    expect(formatMaintenanceAmount('1234.1', 'EUR', 'fr-FR')).toBe('1\u202f234,100000 EUR');
    expect(formatMaintenanceAmount('1234.1', 'EUR', 'es-ES')).toBe('1234,100000 EUR');
  });
  it.each(['1e2', '1.1234567', '1,25', '01', '-1', '1000000000000000000', ''])(
    'rejects an invalid unsigned declaration %s',
    (value: string) => {
      expect(isMaintenanceAmount(value)).toBe(false);
    },
  );
  it('permits a signed exact delta only when the caller explicitly allows it', () => {
    expect(isMaintenanceAmount('-1.000001')).toBe(false);
    expect(isMaintenanceAmount('-1.000001', true)).toBe(true);
    expect(isMaintenanceAmount(' 9007199254740993.123456 ')).toBe(true);
  });
});

import { normalizeInventoryQuantity } from '../stock-quantity.utils';

describe('normalizeInventoryQuantity', () => {
  it.each([
    ['1', '1.000000'],
    ['0.000001', '0.000001'],
    [' 1.5 ', '1.500000'],
    ['999999999999999999.123456', '999999999999999999.123456'],
  ])('preserves exact positive quantity %s', (value, expected) => {
    expect(normalizeInventoryQuantity(value)).toBe(expected);
  });

  it.each([
    '',
    '0',
    '0.000000',
    '-0.000000',
    '-1',
    '1000000000000000000',
    '1.1234567',
    '1e3',
    '1,5',
    '01',
    '+1',
    'Infinity',
    'NaN',
  ])('rejects malformed or non-positive usage %s', (value) => {
    expect(normalizeInventoryQuantity(value)).toBe(null);
  });

  it('permits signed adjustments while still rejecting zero and precision overflow', () => {
    expect(normalizeInventoryQuantity('-999999999999999999.000001', true)).toBe(
      '-999999999999999999.000001',
    );
    expect(normalizeInventoryQuantity('-0.000001', true)).toBe('-0.000001');
    expect(normalizeInventoryQuantity('-0', true)).toBe(null);
    expect(normalizeInventoryQuantity('-1000000000000000000', true)).toBe(null);
    expect(normalizeInventoryQuantity('-1.0000001', true)).toBe(null);
  });
});

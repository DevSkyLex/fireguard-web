import { isProcurementQuantity } from '@features/organization/features/procurement/validators';
import { canonicalExactDecimal, exactDecimalDifference } from '../exact-decimal.utils';

describe('Exact procurement decimal inputs', () => {
  it('retains millionths and large amounts without floating-point rounding', () => {
    expect(canonicalExactDecimal('000.250000')).toBe('0.250000');
    expect(canonicalExactDecimal('999999999999.123456')).toBe('999999999999.123456');
    expect(exactDecimalDifference('0.300000', '0.100000')).toBe('0.200000');
  });
  it.each(['NaN', '1e3', '0.0000001', '1,25', '-0.1', 'Infinity'])(
    'rejects ambiguous or lossy input %s',
    (value) => expect(canonicalExactDecimal(value)).toBeNull(),
  );
  it('keeps fractional stock quantities but rejects fractional individual units and source overdelivery', () => {
    expect(isProcurementQuantity('0.25', 'part', '0.300000')).toBe(true);
    expect(isProcurementQuantity('0.25', 'equipment_to_individualize')).toBe(false);
    expect(isProcurementQuantity('0.300001', 'part', '0.300000')).toBe(false);
    expect(isProcurementQuantity('100000.000001', 'part')).toBe(false);
    expect(isProcurementQuantity('0', 'part')).toBe(false);
  });
});

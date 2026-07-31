import { stringEqualsResolver } from '../string-equals-resolver.utils';

describe('stringEqualsResolver', () => {
  it('forwards a truthy value under the given param name, stringified', () => {
    expect(stringEqualsResolver('status')('active')).toEqual({ status: 'active' });
    expect(stringEqualsResolver('count')(3)).toEqual({ count: '3' });
  });

  it('contributes nothing for a nullish or empty value', () => {
    expect(stringEqualsResolver('status')(null)).toBeNull();
    expect(stringEqualsResolver('status')(undefined)).toBeNull();
    expect(stringEqualsResolver('status')('')).toBeNull();
  });
});

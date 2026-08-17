import type { CollectionFilterOperator } from '../../../models';
import { collectionFilterOperatorLabel } from '../collection-filter-operator-label.utils';

describe('collectionFilterOperatorLabel', () => {
  it('resolves the generic label for a known operator', () => {
    expect(collectionFilterOperatorLabel('equals')).toBe('is');
    expect(collectionFilterOperatorLabel('contains')).toBe('contains');
    expect(collectionFilterOperatorLabel('isAnyOf')).toBe('is any of');
  });

  it('falls back to the raw operator value for one absent from the catalog', () => {
    expect(collectionFilterOperatorLabel('bogus' as CollectionFilterOperator)).toBe('bogus');
  });
});

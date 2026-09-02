import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { toFacilityOption } from '../facility-option.utils';

const facilityOf = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'facility-2',
    organizationId: 'org-1',
    parentFacilityId: 'facility-1',
    hasChildren: false,
    type: 'building',
    name: 'Annex',
    code: null,
    status: 'active',
    address: '12 Quai des Docks',
    metadata: {},
    path: [
      { id: 'facility-1', name: 'Head office', type: 'site' },
      { id: 'facility-2', name: 'Annex', type: 'building' },
    ],
    ...overrides,
  }) as unknown as FacilityOutput;

describe('toFacilityOption', () => {
  it('should name the facility, its localized type and its ancestors', () => {
    expect(toFacilityOption(facilityOf())).toEqual({
      value: 'facility-2',
      label: 'Annex',
      typeLabel: 'Building',
      pathLabel: 'Head office',
      address: '12 Quai des Docks',
    });
  });

  it('should leave the path empty for a root facility and the address null when unknown', () => {
    const option = toFacilityOption(
      facilityOf({
        id: 'facility-1',
        parentFacilityId: null,
        type: 'site',
        name: 'Head office',
        address: null,
        path: [{ id: 'facility-1', name: 'Head office', type: 'site' }],
      }),
    );

    expect(option.pathLabel).toBeNull();
    expect(option.address).toBeNull();
    expect(option.typeLabel).toBe('Site');
  });
});

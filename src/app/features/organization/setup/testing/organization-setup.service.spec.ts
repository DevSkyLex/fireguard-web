import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import {
  OrganizationInvitationService,
  OrganizationRoleService,
  OrganizationService,
} from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import { OrganizationSetupService } from '../organization-setup.service';

const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
  '@context': '/api/contexts/Collection',
  '@id': '/api/test',
  '@type': 'Collection',
  member: items,
  totalItems: items.length,
  view: { '@id': '/api/test?page=1', '@type': 'hydra:PartialCollectionView' },
});

describe('OrganizationSetupService', () => {
  let service: OrganizationSetupService;

  const organizationService = {
    create: vi.fn(),
  };
  const organizationInvitationService = {
    invite: vi.fn(),
  };
  const organizationRoleService = {
    listAll: vi.fn(),
  };
  const facilityService = {
    addressSuggestions: vi.fn(),
    listAll: vi.fn(),
    create: vi.fn(),
  };
  const equipmentService = {
    list: vi.fn(),
    create: vi.fn(),
  };
  const inspectionService = {
    create: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    TestBed.configureTestingModule({
      providers: [
        OrganizationSetupService,
        { provide: OrganizationService, useValue: organizationService },
        { provide: OrganizationInvitationService, useValue: organizationInvitationService },
        { provide: OrganizationRoleService, useValue: organizationRoleService },
        { provide: FacilityService, useValue: facilityService },
        { provide: EquipmentService, useValue: equipmentService },
        { provide: InspectionService, useValue: inspectionService },
      ],
    });

    service = TestBed.inject(OrganizationSetupService);
  });

  it('should delegate organization creation and expose a void completion', () => {
    organizationService.create.mockReturnValue(of({ id: 'org-1' }));

    service.createOrganization({ name: 'Fireguard' }).subscribe((result) => {
      expect(result).toBeUndefined();
    });

    expect(organizationService.create).toHaveBeenCalledWith({ name: 'Fireguard' });
  });

  it('should map organization roles to the setup contract', () => {
    organizationRoleService.listAll.mockReturnValue(
      of([
        {
          '@id': '/api/organizations/org-1/roles/role-1',
          '@type': 'OrganizationRole',
          id: 'role-1',
          organizationId: 'org-1',
          name: 'admin',
          description: 'Full access',
          isSystem: true,
          permissions: ['manage:*'],
          createdAt: '2026-01-01T00:00:00+00:00',
          updatedAt: '2026-01-01T00:00:00+00:00',
        },
      ]),
    );

    service.listRoles('org-1').subscribe((roles) => {
      expect(roles).toEqual([
        {
          id: 'role-1',
          name: 'admin',
          description: 'Full access',
        },
      ]);
    });
  });

  it('forwards a stable recovery context to each owner creation endpoint', () => {
    const context = { onboardingSessionId: 'session-1', onboardingItemKey: 'item-1' };
    organizationService.create.mockReturnValue(of({ id: 'org-1' }));
    organizationInvitationService.invite.mockReturnValue(of({ id: 'invitation-1' }));
    facilityService.create.mockReturnValue(of({ id: 'facility-1', name: 'HQ', type: 'site' }));
    equipmentService.create.mockReturnValue(of({ id: 'equipment-1' }));
    service.createOrganization({ name: 'Acme' }, context).subscribe();
    service
      .inviteMembers('org-1', [{ email: 'one@example.com', roleIds: [null, 'role-1'] }], context)
      .subscribe();
    service.createFacilities('org-1', [{ name: 'HQ', type: 'site' }], context).subscribe();
    service
      .createEquipment('org-1', { type: 'extinguisher', facilityId: 'facility-1' }, context)
      .subscribe();
    expect(organizationService.create).toHaveBeenCalledWith({ name: 'Acme', ...context });
    expect(organizationInvitationService.invite).toHaveBeenCalledWith('org-1', {
      email: 'one@example.com',
      roleIds: ['role-1'],
      ...context,
    });
    expect(facilityService.create).toHaveBeenCalledWith('org-1', {
      name: 'HQ',
      type: 'site',
      ...context,
    });
    expect(equipmentService.create).toHaveBeenCalledWith('org-1', {
      type: 'extinguisher',
      facility: '/api/facilities/facility-1',
      ...context,
    });
  });

  it('should invite multiple members and expose a void completion', () => {
    organizationInvitationService.invite.mockImplementation((organizationId: string, input) =>
      of({ id: `${organizationId}:${input.email}` }),
    );

    service
      .inviteMembers('org-1', [
        { email: 'one@test.dev', roleIds: ['role-1'] },
        { email: 'two@test.dev' },
      ])
      .subscribe((result) => {
        expect(result).toBeUndefined();
      });

    expect(organizationInvitationService.invite).toHaveBeenCalledTimes(2);
    expect(organizationInvitationService.invite).toHaveBeenNthCalledWith(1, 'org-1', {
      email: 'one@test.dev',
      roleIds: ['role-1'],
    });
    expect(organizationInvitationService.invite).toHaveBeenNthCalledWith(2, 'org-1', {
      email: 'two@test.dev',
    });
  });

  it('should normalize empty invitation batches and nullable role identifiers', () => {
    const nextSpy = vi.fn();
    organizationInvitationService.invite.mockImplementation((organizationId: string, input) =>
      of({ id: `${organizationId}:${input.email}` }),
    );

    service.inviteMembers('org-1', []).subscribe({ next: nextSpy });
    service
      .inviteMembers('org-1', [{ email: 'one@test.dev', roleIds: [null, 'role-1', null] }])
      .subscribe((result) => {
        expect(result).toBeUndefined();
      });

    expect(nextSpy).toHaveBeenCalledWith(undefined);
    expect(organizationInvitationService.invite).toHaveBeenCalledTimes(1);
    expect(organizationInvitationService.invite).toHaveBeenCalledWith('org-1', {
      email: 'one@test.dev',
      roleIds: ['role-1'],
    });
  });

  it('should map equipment to the setup summary contract', () => {
    equipmentService.list.mockReturnValue(
      of(
        mockCollection([
          {
            '@id': '/api/organizations/org-1/equipment/equipment-1',
            '@type': 'Equipment',
            id: 'equipment-1',
            organizationId: 'org-1',
            facilityId: null,
            type: 'fire_extinguisher',
            subType: null,
            brand: 'Sicli',
            model: 'XL6',
            serialNumber: 'SN-123',
            locationLabel: null,
            status: 'in_stock',
            installedAt: null,
            commissionedAt: null,
            tags: [],
            createdAt: '2026-01-01T00:00:00+00:00',
            updatedAt: '2026-01-01T00:00:00+00:00',
          },
        ]),
      ),
    );

    service.listEquipment('org-1').subscribe((equipment) => {
      expect(equipment).toEqual([
        {
          id: 'equipment-1',
          type: 'fire_extinguisher',
          serialNumber: 'SN-123',
        },
      ]);
    });

    expect(equipmentService.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 100 });
  });

  it('should create facilities and return their setup summaries', () => {
    facilityService.create.mockImplementation((organizationId: string, input) =>
      of({ id: `${organizationId}:${input.name}`, name: input.name, type: input.type }),
    );

    service
      .createFacilities('org-1', [
        { type: 'site', name: 'HQ' },
        { type: 'building', name: 'Building A', address: '12 Main Street' },
      ])
      .subscribe((result) => {
        expect(result).toEqual([
          { id: 'org-1:HQ', name: 'HQ', type: 'site' },
          { id: 'org-1:Building A', name: 'Building A', type: 'building' },
        ]);
      });

    expect(facilityService.create).toHaveBeenCalledTimes(2);
  });

  it('should complete facility creation with an empty list when there is nothing to create', () => {
    const nextSpy = vi.fn();

    service.createFacilities('org-1', []).subscribe({ next: nextSpy });

    expect(nextSpy).toHaveBeenCalledWith([]);
    expect(facilityService.create).not.toHaveBeenCalled();
  });

  it('should map the equipment facilityId to the flat facility IRI', () => {
    equipmentService.create.mockReturnValue(of({ id: 'equipment-1' }));

    service
      .createEquipment('org-1', { type: 'fire_extinguisher', facilityId: 'facility-1' })
      .subscribe((result) => {
        expect(result).toBeUndefined();
      });

    expect(equipmentService.create).toHaveBeenCalledWith('org-1', {
      type: 'fire_extinguisher',
      facility: '/api/facilities/facility-1',
    });
  });

  it('should delegate equipment and inspection creation through the setup contract', () => {
    equipmentService.create.mockReturnValue(of({ id: 'equipment-1' }));
    inspectionService.create.mockReturnValue(of({ id: 'inspection-1' }));

    service
      .createEquipment('org-1', {
        type: 'fire_extinguisher',
        brand: 'Sicli',
        model: 'XL6',
        serialNumber: 'SN-123',
      })
      .subscribe((result) => {
        expect(result).toBeUndefined();
      });
    service
      .createInspection('org-1', {
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-01-01T00:00:00+00:00',
        inspectorType: 'user',
        inspectorName: 'Inspector Gadget',
      })
      .subscribe((result) => {
        expect(result).toBeUndefined();
      });

    expect(equipmentService.create).toHaveBeenCalledWith('org-1', {
      type: 'fire_extinguisher',
      brand: 'Sicli',
      model: 'XL6',
      serialNumber: 'SN-123',
    });
    expect(inspectionService.create).toHaveBeenCalledWith('org-1', {
      equipmentId: 'equipment-1',
      result: 'pass',
      performedAt: '2026-01-01T00:00:00+00:00',
      inspectorType: 'user',
      inspectorName: 'Inspector Gadget',
    });
  });
  it('should read all persisted facilities through the setup summary boundary', () => {
    facilityService.listAll.mockReturnValue(
      of([{ id: 'facility-1', name: 'HQ', type: 'site', address: 'Not needed by setup' }]),
    );
    service.listFacilities('org-1').subscribe((facilities) => {
      expect(facilities).toEqual([{ id: 'facility-1', name: 'HQ', type: 'site' }]);
    });
    expect(facilityService.listAll).toHaveBeenCalledExactlyOnceWith('org-1');
  });
  it('maps address suggestions through the setup boundary without leaking the envelope', () => {
    const match = Object.freeze({
      displayName: '1 Rue de la Paix',
      street: '1 Rue de la Paix',
      city: 'Paris',
      region: 'Île-de-France',
      postalCode: '75002',
      country: 'France',
      countryCode: 'FR',
      latitude: 48.86,
      longitude: 2.33,
    });
    facilityService.addressSuggestions.mockReturnValue(of({ member: [match], totalItems: 1 }));
    service.searchFacilityAddresses('org-1', 'Rue de la Paix').subscribe((matches) => {
      expect(matches).toEqual([match]);
      expect(matches[0]).not.toBe(match);
    });
    expect(facilityService.addressSuggestions).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      'Rue de la Paix',
    );
  });

  it('preserves an address provider failure for the owning store', () => {
    const failure = new Error('Provider unavailable');
    facilityService.addressSuggestions.mockReturnValue(throwError(() => failure));
    service.searchFacilityAddresses('org-1', 'Paris').subscribe({
      next: () => {
        throw new Error('An outage must not become an empty result');
      },
      error: (error: unknown) => expect(error).toBe(failure),
    });
  });

  it('passes selected address coordinates to facility creation', () => {
    const facility = Object.freeze({
      name: 'HQ',
      type: 'site' as const,
      address: '1 Rue de la Paix',
      latitude: 48.86,
      longitude: 2.33,
    });
    facilityService.create.mockReturnValue(of({ ...facility, id: 'site-1' }));
    service.createFacilities('org-1', [facility]).subscribe((result) => {
      expect(result).toEqual([{ id: 'site-1', name: 'HQ', type: 'site' }]);
    });
    expect(facilityService.create).toHaveBeenCalledExactlyOnceWith('org-1', facility);
  });
});

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Dispatcher } from '@ngrx/signals/events';
import type {
  FacilityTypeOption,
  FacilityOutput,
  CreateFirstFacilityOnboardingInput,
  CreateOnboardingOrganizationInput,
  OrganizationLegalProfileOutput,
  OrganizationLegalTypeOption,
  OrganizationOnboardingStatusOutput,
  OrganizationOutput,
  UpsertOrganizationLegalProfileInput,
} from '@core/models/organization';
import { OrganizationService } from '@core/services/api/organization';
import { OrganizationStore } from './organization.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('OrganizationStore', () => {
  let store: OrganizationStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: {
    listOrganizationLegalTypes: ReturnType<typeof vi.fn>;
    listFacilityTypes: ReturnType<typeof vi.fn>;
    getOnboardingStatus: ReturnType<typeof vi.fn>;
    createOnboardingOrganization: ReturnType<typeof vi.fn>;
    upsertOrganizationLegalProfile: ReturnType<typeof vi.fn>;
    createFirstFacilityOnboarding: ReturnType<typeof vi.fn>;
  };

  const statusCreateOrganization: OrganizationOnboardingStatusOutput = {
    state: 'in_progress',
    nextStep: 'create_organization',
    blockedReason: null,
    steps: [
      {
        key: 'create_organization',
        label: 'Create organization',
        status: 'pending',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'complete_legal_profile',
        label: 'Complete legal profile',
        status: 'blocked',
        required: true,
        available: false,
        reason: 'organization_required',
      },
      {
        key: 'create_first_facility',
        label: 'Create first facility',
        status: 'blocked',
        required: false,
        available: false,
        reason: 'organization_required',
      },
    ],
    targetOrganizationId: null,
    targetOrganizationName: null,
  };

  const statusCompleteLegalProfile: OrganizationOnboardingStatusOutput = {
    state: 'in_progress',
    nextStep: 'complete_legal_profile',
    blockedReason: null,
    steps: [
      {
        key: 'create_organization',
        label: 'Create organization',
        status: 'completed',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'complete_legal_profile',
        label: 'Complete legal profile',
        status: 'pending',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'create_first_facility',
        label: 'Create first facility',
        status: 'blocked',
        required: false,
        available: false,
        reason: 'legal_profile_required',
      },
    ],
    targetOrganizationId: 'org-123',
    targetOrganizationName: 'Fireguard Paris',
  };

  const statusCreateFirstFacility: OrganizationOnboardingStatusOutput = {
    state: 'in_progress',
    nextStep: 'create_first_facility',
    blockedReason: null,
    steps: [
      {
        key: 'create_organization',
        label: 'Create organization',
        status: 'completed',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'complete_legal_profile',
        label: 'Complete legal profile',
        status: 'completed',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'create_first_facility',
        label: 'Create first facility',
        status: 'pending',
        required: false,
        available: true,
        reason: null,
      },
    ],
    targetOrganizationId: 'org-123',
    targetOrganizationName: 'Fireguard Paris',
  };

  const statusCompleted: OrganizationOnboardingStatusOutput = {
    state: 'completed',
    nextStep: null,
    blockedReason: null,
    steps: [
      {
        key: 'create_organization',
        label: 'Create organization',
        status: 'completed',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'complete_legal_profile',
        label: 'Complete legal profile',
        status: 'completed',
        required: true,
        available: true,
        reason: null,
      },
      {
        key: 'create_first_facility',
        label: 'Create first facility',
        status: 'completed',
        required: false,
        available: true,
        reason: null,
      },
    ],
    targetOrganizationId: 'org-123',
    targetOrganizationName: 'Fireguard Paris',
  };

  const statusBlocked: OrganizationOnboardingStatusOutput = {
    state: 'blocked',
    nextStep: null,
    blockedReason: 'organization_locked',
    steps: [
      {
        key: 'create_organization',
        label: 'Create organization',
        status: 'blocked',
        required: true,
        available: false,
        reason: 'organization_locked',
      },
      {
        key: 'complete_legal_profile',
        label: 'Complete legal profile',
        status: 'blocked',
        required: true,
        available: false,
        reason: 'organization_required',
      },
      {
        key: 'create_first_facility',
        label: 'Create first facility',
        status: 'blocked',
        required: false,
        available: false,
        reason: 'organization_required',
      },
    ],
    targetOrganizationId: null,
    targetOrganizationName: null,
  };

  const organizationOutput: OrganizationOutput = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Fireguard Paris',
    slug: 'fireguard-paris',
    ownerUserId: '550e8400-e29b-41d4-a716-446655440002',
    createdByUserId: '550e8400-e29b-41d4-a716-446655440002',
    status: 'active',
    isActive: true,
    createdAt: '2026-02-17T13:00:00.000Z',
    updatedAt: '2026-02-17T13:00:00.000Z',
  };

  const legalProfileOutput: OrganizationLegalProfileOutput = {
    organizationId: 'org-123',
    legalType: 'company',
    legalName: 'Fireguard Paris SAS',
    registrationNumber: 'RCS-PAR-123456789',
    vatNumber: 'FR00123456789',
    requirements: {
      registrationNumber: { required: true },
      vatNumber: { required: false },
    },
    createdAt: '2026-02-17T13:00:00.000Z',
    updatedAt: '2026-02-17T13:00:00.000Z',
  };

  const facilityOutput: FacilityOutput = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    organizationId: 'org-123',
    parentFacilityId: null,
    type: 'site',
    name: 'Headquarters',
    code: 'SITE-PAR-001',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-02-17T13:00:00.000Z',
    updatedAt: '2026-02-17T13:00:00.000Z',
  };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOrganizationService = {
      listOrganizationLegalTypes: vi.fn(),
      listFacilityTypes: vi.fn(),
      getOnboardingStatus: vi.fn(),
      createOnboardingOrganization: vi.fn(),
      upsertOrganizationLegalProfile: vi.fn(),
      createFirstFacilityOnboarding: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
      ],
    });

    store = TestBed.inject(OrganizationStore);
  });

  it('should map onboarding routes from status', () => {
    expect(store.resolveOnboardingRoute(statusCreateOrganization, '/')).toBe('/onboarding');
    expect(store.resolveOnboardingRoute(statusCompleteLegalProfile, '/')).toBe('/onboarding');
    expect(store.resolveOnboardingRoute(statusCreateFirstFacility, '/')).toBe('/onboarding');
    expect(store.resolveOnboardingRoute(statusBlocked, '/')).toBe('/onboarding');
    expect(store.resolveOnboardingRoute(statusCompleted, '/')).toBe('/');
  });

  it('should load onboarding status successfully', async () => {
    mockOrganizationService.getOnboardingStatus.mockReturnValue(of(statusCreateOrganization));

    store.loadOnboardingStatus();
    await flushEffects();

    expect(mockOrganizationService.getOnboardingStatus).toHaveBeenCalledTimes(1);
    expect(store.onboardingStatusLoadOperation().status).toBe('success');
    expect(store.onboardingStatus()).toEqual(statusCreateOrganization);
  });

  it('should load organization legal type options successfully', async () => {
    mockOrganizationService.listOrganizationLegalTypes.mockReturnValue(
      of(organizationLegalTypeOptions),
    );

    store.loadOrganizationLegalTypeOptions();
    await flushEffects();

    expect(mockOrganizationService.listOrganizationLegalTypes).toHaveBeenCalledTimes(1);
    expect(store.organizationLegalTypeOptionsLoadOperation().status).toBe('success');
    expect(store.organizationLegalTypeOptions()).toEqual(organizationLegalTypeOptions);
  });

  it('should load facility type options successfully', async () => {
    mockOrganizationService.listFacilityTypes.mockReturnValue(of(facilityTypeOptions));

    store.loadFacilityTypeOptions();
    await flushEffects();

    expect(mockOrganizationService.listFacilityTypes).toHaveBeenCalledTimes(1);
    expect(store.facilityTypeOptionsLoadOperation().status).toBe('success');
    expect(store.facilityTypeOptions()).toEqual(facilityTypeOptions);
  });

  it('should dispatch event when status loading fails', async () => {
    mockOrganizationService.getOnboardingStatus.mockReturnValue(
      throwError(() => new Error('Status failed')),
    );

    store.loadOnboardingStatus();
    await flushEffects();

    expect(store.onboardingStatusLoadOperation().status).toBe('error');
    expect(mockDispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should create onboarding organization and refresh status', async () => {
    const payload: CreateOnboardingOrganizationInput = {
      name: 'Fireguard Paris',
      slug: 'fireguard-paris',
    };
    mockOrganizationService.createOnboardingOrganization.mockReturnValue(
      of(organizationOutput),
    );
    mockOrganizationService.getOnboardingStatus.mockReturnValue(of(statusCompleteLegalProfile));

    store.submitOnboardingOrganization(payload);
    await flushEffects();

    expect(mockOrganizationService.createOnboardingOrganization).toHaveBeenCalledWith(payload);
    expect(mockOrganizationService.getOnboardingStatus).toHaveBeenCalledTimes(1);
    expect(store.onboardingOrganizationCreateOperation().status).toBe('success');
    expect(store.onboardingStatus()).toEqual(statusCompleteLegalProfile);
  });

  it('should upsert legal profile and refresh status to first facility step', async () => {
    const payload: UpsertOrganizationLegalProfileInput = {
      legalType: 'company',
      legalName: 'Fireguard Paris SAS',
      registrationNumber: 'RCS-PAR-123456789',
      vatNumber: 'FR00123456789',
    };
    mockOrganizationService.upsertOrganizationLegalProfile.mockReturnValue(
      of(legalProfileOutput),
    );
    mockOrganizationService.getOnboardingStatus.mockReturnValue(of(statusCreateFirstFacility));

    store.submitOnboardingLegalProfile({
      organizationId: 'org-123',
      payload,
    });
    await flushEffects();

    expect(mockOrganizationService.upsertOrganizationLegalProfile).toHaveBeenCalledWith(
      'org-123',
      payload,
    );
    expect(mockOrganizationService.getOnboardingStatus).toHaveBeenCalledTimes(1);
    expect(store.onboardingLegalProfileUpsertOperation().status).toBe('success');
    expect(store.onboardingStatus()).toEqual(statusCreateFirstFacility);
  });

  it('should create first facility and refresh status to completed', async () => {
    const payload: CreateFirstFacilityOnboardingInput = {
      type: 'site',
      name: 'Headquarters',
      code: 'SITE-PAR-001',
    };
    mockOrganizationService.createFirstFacilityOnboarding.mockReturnValue(of(facilityOutput));
    mockOrganizationService.getOnboardingStatus.mockReturnValue(of(statusCompleted));

    store.submitOnboardingFirstFacility({
      organizationId: 'org-123',
      payload,
    });
    await flushEffects();

    expect(mockOrganizationService.createFirstFacilityOnboarding).toHaveBeenCalledWith(
      'org-123',
      payload,
    );
    expect(mockOrganizationService.getOnboardingStatus).toHaveBeenCalledTimes(1);
    expect(store.onboardingFirstFacilityCreateOperation().status).toBe('success');
    expect(store.onboardingStatus()).toEqual(statusCompleted);
  });

  it('should reset state with resetStore()', () => {
    store.resetStore();

    expect(store.organizationLegalTypeOptions()).toEqual([]);
    expect(store.organizationLegalTypeOptionsLoadOperation().status).toBe('idle');
    expect(store.facilityTypeOptions()).toEqual([]);
    expect(store.facilityTypeOptionsLoadOperation().status).toBe('idle');
    expect(store.onboardingStatus()).toBeNull();
    expect(store.onboardingStatusLoadOperation().status).toBe('idle');
    expect(store.onboardingOrganizationCreateOperation().status).toBe('idle');
    expect(store.onboardingLegalProfileUpsertOperation().status).toBe('idle');
    expect(store.onboardingFirstFacilityCreateOperation().status).toBe('idle');
  });
});
  const organizationLegalTypeOptions: readonly OrganizationLegalTypeOption[] = [
    {
      value: 'company',
      label: 'Company',
      requirements: {
        registrationNumber: { required: true },
        vatNumber: { required: false },
      },
    },
    {
      value: 'individual',
      label: 'Individual',
      requirements: {
        registrationNumber: { required: false },
        vatNumber: { required: false },
      },
    },
  ];

  const facilityTypeOptions: readonly FacilityTypeOption[] = [
    { value: 'site', label: 'Site' },
    { value: 'building', label: 'Building' },
  ];

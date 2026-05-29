import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import type { FacilityFormValues } from '@features/organization/features/facilities/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilityEditPage } from '../facility-edit.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

const MOCK_FACILITY: FacilityOutput = {
  '@id': '/api/facilities/fac-1',
  '@type': 'Facility',
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
  code: 'MS-01',
  address: null,
  parentFacilityId: null,
  hasChildren: false,
  metadata: {},
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as unknown as FacilityOutput;

describe('FacilityEditPage', () => {
  const mockActiveFacilityStore = {
    selectedFacility: signal<FacilityOutput | null>(null),
    isLoadingFacility: signal<boolean>(false),
  };

  const mockFacilityStore = {
    isUpdating: signal<boolean>(false),
    updateCallState: signal<{ status: string; data: FacilityOutput | null }>({
      status: 'idle',
      data: null,
    }),
    update: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
  const mockMessageService = { add: vi.fn() };

  beforeEach(() => {
    mockActiveFacilityStore.selectedFacility.set(null);
    mockActiveFacilityStore.isLoadingFacility.set(false);
    mockFacilityStore.isUpdating.set(false);
    mockFacilityStore.updateCallState.set({ status: 'idle', data: null });
    mockFacilityStore.update.mockReset();
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      imports: [FacilityEditPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).overrideComponent(FacilityEditPage, {
      set: { providers: [{ provide: FacilityStore, useValue: mockFacilityStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display page heading', () => {
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Edit Facility');
  });

  it('should show skeleton while loading', () => {
    mockActiveFacilityStore.isLoadingFacility.set(true);
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();
    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should not render form while loading', () => {
    mockActiveFacilityStore.isLoadingFacility.set(true);
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-facility-form')).toBeNull();
  });

  it('should render form when facility is resolved', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-facility-form')).not.toBeNull();
  });

  it('should dispatch update action with correct payload on handleSubmit', () => {
    mockActiveFacilityStore.selectedFacility.set(MOCK_FACILITY);
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();

    const values: FacilityFormValues = {
      type: 'site',
      name: 'Updated Site',
      code: '',
      address: '123 Main St',
      parentFacilityId: '',
    };
    fixture.componentInstance['handleSubmit'](values);

    expect(mockFacilityStore.update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'fac-1',
      input: {
        name: 'Updated Site',
        code: null,
        address: '123 Main St',
      },
    });
  });

  it('should not dispatch update when organization or facility is missing', () => {
    mockActiveOrgStore.selectedOrganization.set(null);
    mockActiveFacilityStore.selectedFacility.set(null);
    const fixture = TestBed.createComponent(FacilityEditPage);
    fixture.detectChanges();

    fixture.componentInstance['handleSubmit']({
      type: 'site',
      name: 'Name',
      code: '',
      address: '',
      parentFacilityId: '',
    });
    expect(mockFacilityStore.update).not.toHaveBeenCalled();
  });
});

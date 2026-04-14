import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import type { FacilityFormValues } from '@features/organization/features/facilities/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { FacilityCreatePage } from '../facility-create.component';

const MOCK_ORG: OrganizationOutput = {
  id: 'org-1',
  name: 'Acme Corp',
} as OrganizationOutput;

describe('FacilityCreatePage', () => {
  const mockFacilityStore = {
    facilities: signal<readonly FacilityOutput[]>([]),
    isCreating: signal<boolean>(false),
    createCallState: signal<{ status: string; data: FacilityOutput | null }>({
      status: 'idle',
      data: null,
    }),
    createError: signal(null),
    loadFacilities: vi.fn(),
    create: vi.fn(),
    resetCreateOperation: vi.fn(),
  };

  const mockActiveOrgStore = {
    selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG),
  };

  const mockEvents = { on: vi.fn().mockReturnValue(EMPTY) };
  const mockMessageService = { add: vi.fn() };

  beforeEach(() => {
    mockFacilityStore.facilities.set([]);
    mockFacilityStore.isCreating.set(false);
    mockFacilityStore.createCallState.set({ status: 'idle', data: null });
    mockFacilityStore.loadFacilities.mockReset();
    mockFacilityStore.create.mockReset();
    mockActiveOrgStore.selectedOrganization.set(MOCK_ORG);

    TestBed.configureTestingModule({
      imports: [FacilityCreatePage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: mockActiveOrgStore },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).overrideComponent(FacilityCreatePage, {
      set: { providers: [{ provide: FacilityStore, useValue: mockFacilityStore }] },
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display page heading', () => {
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('New Facility');
  });

  it('should render the facility form', () => {
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-facility-form')).not.toBeNull();
  });

  it('should load facilities for parent selection on init', () => {
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();
    expect(mockFacilityStore.loadFacilities).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { itemsPerPage: 200 },
    });
  });

  it('should not load facilities when organization is missing', () => {
    mockActiveOrgStore.selectedOrganization.set(null);
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();
    expect(mockFacilityStore.loadFacilities).not.toHaveBeenCalled();
  });

  it('should dispatch create action with correct payload on handleSubmit', () => {
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();

    const values: FacilityFormValues = {
      type: 'site',
      name: 'New Site',
      code: 'NS-01',
      address: '',
      parentFacilityId: '',
    };
    fixture.componentInstance['handleSubmit'](values);

    expect(mockFacilityStore.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        type: 'site',
        name: 'New Site',
        code: 'NS-01',
      },
    });
  });

  it('should not dispatch create when organization is missing', () => {
    mockActiveOrgStore.selectedOrganization.set(null);
    const fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.detectChanges();

    fixture.componentInstance['handleSubmit']({
      type: 'site',
      name: 'New Site',
      code: '',
      address: '',
      parentFacilityId: '',
    });
    expect(mockFacilityStore.create).not.toHaveBeenCalled();
  });
});


import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  CreateFacilityInput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { FacilityCreatePage } from '../facility-create-page.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    '@id': '/api/facilities/facility-9',
    '@type': 'Facility',
    id: 'facility-9',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Warehouse B',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityCreatePage', () => {
  let fixture: ComponentFixture<FacilityCreatePage>;
  let create: ReturnType<typeof vi.fn>;
  let ensureParentOptionsLoaded: ReturnType<typeof vi.fn>;
  let resetCreateOperation: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let geocode: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let facilities: WritableSignal<readonly FacilityOutput[]>;
  let createCallState: WritableSignal<CallState<FacilityOutput | null>>;

  beforeEach(async () => {
    create = vi.fn();
    ensureParentOptionsLoaded = vi.fn();
    resetCreateOperation = vi.fn();
    geocode = vi.fn();
    feedbackError = vi.fn();
    facilities = signal<readonly FacilityOutput[]>([]);
    createCallState = signal<CallState<FacilityOutput | null>>(idleCallState());

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: FacilityService, useValue: { geocode } },
        { provide: FeedbackService, useValue: { error: feedbackError } },
        {
          provide: FacilityStore,
          useValue: {
            create,
            ensureParentOptionsLoaded,
            resetCreateOperation,
            createCallState,
            isCreating: signal(false),
            createError: signal(null),
            facilities,
          },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(FacilityCreatePage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  });

  it('should load candidate parents for the workspace on arrival', () => {
    expect(ensureParentOptionsLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should offer the store’s cached facilities as parent options', async () => {
    facilities.set([
      facility({ id: 'f-1', name: 'Site A' }),
      facility({ id: 'f-2', name: 'Site B' }),
    ]);
    await fixture.whenStable();

    expect(fixture.componentInstance['parentOptions']()).toEqual([
      { value: 'f-1', label: 'Site A' },
      { value: 'f-2', label: 'Site B' },
    ]);
  });

  it('should send the submitted payload to the store', () => {
    const payload: CreateFacilityInput = { type: 'building', name: 'Warehouse B' };

    fixture.componentInstance['onSubmitted'](payload);

    expect(create).toHaveBeenCalledWith({ organizationId: 'org-1', input: payload });
  });

  it('should navigate to the created record and reset the create state once the write succeeds', async () => {
    createCallState.set(successCallState(facility()));
    await fixture.whenStable();

    expect(resetCreateOperation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'facility-9']);
  });

  describe('the "Locate address" lookup', () => {
    const requestGeocode = (address: string): void => {
      (
        fixture.componentInstance as unknown as { onGeocodeRequested(address: string): void }
      ).onGeocodeRequested(address);
    };

    it('should hand a match to the form and clear the pending flag', async () => {
      const match = {
        '@id': '/api/organizations/org-1/facilities/geocode',
        '@type': 'GeocodeAddress',
        displayName: '1 Main Street, Springfield',
        latitude: 12.5,
        longitude: -7.25,
      };
      geocode.mockReturnValue(of(match));

      requestGeocode('1 Main Street');
      await fixture.whenStable();

      expect(geocode).toHaveBeenCalledWith('org-1', '1 Main Street');
      expect(fixture.componentInstance['geocodeResult']()).toEqual(match);
      expect(fixture.componentInstance['geocodePending']()).toBe(false);
      expect(fixture.componentInstance['geocodeNotFound']()).toBe(false);
      expect(feedbackError).not.toHaveBeenCalled();
    });

    it('should render a 404 no-match inline rather than toasting', async () => {
      geocode.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 404,
          type: 'about:blank',
          title: 'Not Found',
          detail: 'No match for the given address.',
        })),
      );

      requestGeocode('nowhere at all');
      await fixture.whenStable();

      expect(fixture.componentInstance['geocodeNotFound']()).toBe(true);
      expect(fixture.componentInstance['geocodeResult']()).toBeNull();
      expect(feedbackError).not.toHaveBeenCalled();
    });

    it('should surface any other refusal detail as an error toast', async () => {
      geocode.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 429,
          type: 'about:blank',
          title: 'Too Many Requests',
          detail: 'Too many geocoding requests.',
        })),
      );

      requestGeocode('1 Main Street');
      await fixture.whenStable();

      expect(feedbackError).toHaveBeenCalledWith('Too many geocoding requests.');
      expect(fixture.componentInstance['geocodeNotFound']()).toBe(false);
    });
  });

  it('should return to the facility list on cancel', () => {
    fixture.componentInstance['onCancelled']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities']);
  });

  it('should report nothing unsaved when the form is pristine', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('should report unsaved work once the form reports dirty and no write is settled', () => {
    fixture.componentInstance['formDirty'].set(true);

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('should not report unsaved work once the create write has succeeded, even while dirty', () => {
    fixture.componentInstance['formDirty'].set(true);
    createCallState.set(successCallState(facility()));

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('should resolve confirmDeactivation true once the dialog reports confirmed', async () => {
    const result = fixture.componentInstance.confirmDeactivation();

    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');

    fixture.componentInstance['onUnsavedChangesConfirmed']();

    await expect(result).resolves.toBe(true);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should resolve confirmDeactivation false once the dialog reports dismissed', async () => {
    const result = fixture.componentInstance.confirmDeactivation();

    fixture.componentInstance['onUnsavedChangesDismissed']();

    await expect(result).resolves.toBe(false);
  });
});

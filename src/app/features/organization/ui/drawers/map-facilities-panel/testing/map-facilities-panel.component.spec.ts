import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { pendingCallState, successCallState, type CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { MapFacilitiesStore } from '@features/organization/state';
import { MapFacilitiesPanel } from '../map-facilities-panel.component';

const facility = (id: string, name: string): FacilityOutput =>
  ({
    id,
    name,
    latitude: 48.85,
    longitude: 2.35,
    equipmentCount: 0,
    metadata: {},
  }) as unknown as FacilityOutput;

const FACILITIES: readonly FacilityOutput[] = [
  facility('f1', 'Acme HQ'),
  facility('f2', 'North Depot'),
];

const at = (fixture: ComponentFixture<MapFacilitiesPanel>, testId: string): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

describe('MapFacilitiesPanel', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let storeMock: {
    filteredFacilities: ReturnType<typeof signal<readonly FacilityOutput[]>>;
    actionError: ReturnType<typeof signal<string | null>>;
    search: ReturnType<typeof signal<string>>;
    showAddForm: ReturnType<typeof signal<boolean>>;
    creating: ReturnType<typeof signal<boolean>>;
    isEmpty: ReturnType<typeof signal<boolean>>;
    isSearchEmpty: ReturnType<typeof signal<boolean>>;
    listCallState: ReturnType<typeof signal<CallState<readonly FacilityOutput[]>>>;
    selectedFacilityId: ReturnType<typeof signal<string | null>>;
    mapStats: ReturnType<
      typeof signal<ReadonlyMap<string, { buildingsCount: number; complianceRate: number | null }>>
    >;
    setSearch: ReturnType<typeof vi.fn>;
    openAddForm: ReturnType<typeof vi.fn>;
    cancelAddForm: ReturnType<typeof vi.fn>;
    selectFacility: ReturnType<typeof vi.fn>;
    requestFitAll: ReturnType<typeof vi.fn>;
    submitAddFacility: ReturnType<typeof vi.fn>;
  };

  const render = (): ComponentFixture<MapFacilitiesPanel> => {
    router = { navigate: vi.fn().mockResolvedValue(true) };
    storeMock = {
      filteredFacilities: signal(FACILITIES),
      actionError: signal<string | null>(null),
      search: signal(''),
      showAddForm: signal(false),
      creating: signal(false),
      isEmpty: signal(false),
      isSearchEmpty: signal(false),
      listCallState: signal(successCallState(FACILITIES)),
      selectedFacilityId: signal<string | null>(null),
      mapStats: signal(new Map()),
      setSearch: vi.fn(),
      openAddForm: vi.fn(),
      cancelAddForm: vi.fn(),
      selectFacility: vi.fn(),
      requestFitAll: vi.fn(),
      submitAddFacility: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: MapFacilitiesStore, useValue: storeMock },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
      ],
    });

    const fixture = TestBed.createComponent(MapFacilitiesPanel);
    fixture.detectChanges();
    return fixture;
  };

  it('renders every filtered facility as a card', () => {
    const fixture = render();

    expect(fixture.nativeElement.textContent).toContain('Acme HQ');
    expect(fixture.nativeElement.textContent).toContain('North Depot');
  });

  it('forwards the search input to the store', () => {
    const fixture = render();

    const input = at(fixture, 'map-panel-search') as HTMLInputElement;
    input.value = 'depot';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(storeMock.setSearch).toHaveBeenCalledWith('depot');
  });

  it('requests a fit-all from the store', () => {
    const fixture = render();

    at(fixture, 'map-panel-fit-all')?.querySelector('button')?.click();

    expect(storeMock.requestFitAll).toHaveBeenCalled();
  });

  it('opens the add-facility form', () => {
    const fixture = render();

    at(fixture, 'map-panel-add')?.querySelector('button')?.click();

    expect(storeMock.openAddForm).toHaveBeenCalled();
  });

  it('shows the inline form once the store opens it, hiding the Add button', () => {
    const fixture = render();
    storeMock.showAddForm.set(true);
    fixture.detectChanges();

    expect(at(fixture, 'map-add-facility-form')).not.toBeNull();
    expect(at(fixture, 'map-panel-add')).toBeNull();
  });

  it('shows loading placeholders instead of a blank list while the first fetch is pending', () => {
    const fixture = render();
    storeMock.listCallState.set(pendingCallState());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid="map-panel-item"]')).toHaveLength(
      0,
    );
    expect(fixture.nativeElement.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows the empty state driven by the store, not local state', () => {
    const fixture = render();
    storeMock.isEmpty.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No facilities to place yet');
  });

  it('shows "no match" driven by the store when a search excludes everything', () => {
    const fixture = render();
    storeMock.isSearchEmpty.set(true);
    fixture.detectChanges();

    expect(at(fixture, 'map-panel-no-match')?.textContent).toContain(
      'No facilities match your search.',
    );
  });

  it('selects a facility through the store when its card is activated', () => {
    const fixture = render();

    (
      at(fixture, 'map-panel-item')?.querySelector(
        '[data-testid="map-facility-card-select"]',
      ) as HTMLElement | null
    )?.click();

    expect(storeMock.selectFacility).toHaveBeenCalledWith('f1');
  });

  it('navigates to the facility record when "Open in Facilities" is activated', () => {
    const fixture = render();

    // The action row — including "Open in Facilities" — is only revealed once the
    // card is the selected one, so drive the store selection first.
    storeMock.selectedFacilityId.set('f1');
    fixture.detectChanges();

    at(fixture, 'map-panel-item')
      ?.querySelector('[data-testid="map-facility-card-open"] button')
      ?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(router.navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'f1']);
  });

  it('forwards a submitted add-facility form to the store', () => {
    const fixture = render();
    storeMock.showAddForm.set(true);
    fixture.detectChanges();

    const form = at(fixture, 'map-add-facility-form') as HTMLFormElement;
    const nameInput = form.querySelector(
      '[data-testid="map-add-facility-name"]',
    ) as HTMLInputElement;
    nameInput.value = 'New Site';
    nameInput.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(storeMock.submitAddFacility).toHaveBeenCalledWith({ name: 'New Site', city: '' });
  });
});

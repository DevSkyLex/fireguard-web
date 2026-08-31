import {
  Component,
  input,
  output,
  provideZonelessChangeDetection,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type {
  FacilityEditState,
  FacilityEditTarget,
  FacilityOutput,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import type { MapCoordinates } from '@shared/map';
import { FacilityMapPickerDialog } from '../../../dialogs/facility-map-picker-dialog';
import { FacilityInformationPanel } from '../facility-information-panel.component';

/**
 * Stands in for `FacilityMapPickerDialog`, so no spec ever opens the CDK
 * overlay and mounts MapLibre. Substituted on the fixture's own root
 * component, never on a descendant: an override reaches a descendant only
 * while its parent's compiled view has not already been cached by another
 * spec file, which `isolate: false` makes a coin toss.
 */
@Component({ selector: 'app-facility-map-picker-dialog', template: '' })
class MapPickerDialogStub {
  public readonly visible: InputSignal<boolean> = input<boolean>(false);
  public readonly center: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  public readonly picked: OutputEmitterRef<MapCoordinates> = output<MapCoordinates>();
}

const IDLE_EDIT_STATE: FacilityEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

const FACILITY: FacilityOutput = {
  '@id': '/api/facilities/facility-1',
  '@type': 'Facility',
  id: 'facility-1',
  organizationId: 'org-1',
  parentFacilityId: null,
  hasChildren: false,
  type: 'building',
  name: 'Headquarters',
  code: 'HQ-01',
  status: 'active',
  address: '1 Main Street',
  metadata: {},
  latitude: 48.8566,
  longitude: 2.3522,
  path: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('FacilityInformationPanel', () => {
  let fixture: ComponentFixture<FacilityInformationPanel>;
  let patches: UpdateFacilityInput[];
  let editTargets: (FacilityEditTarget | null)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const saveButton = (): HTMLButtonElement | undefined =>
    Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );
  const coordinateInputs = (): readonly HTMLInputElement[] => [
    ...root().querySelectorAll<HTMLInputElement>(
      '[data-testid="facility-field-coordinates"] input[type="number"]',
    ),
  ];
  const picker = (): MapPickerDialogStub =>
    fixture.debugElement.query(By.directive(MapPickerDialogStub))
      .componentInstance as MapPickerDialogStub;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    TestBed.overrideComponent(FacilityInformationPanel, {
      remove: { imports: [FacilityMapPickerDialog] },
      add: { imports: [MapPickerDialogStub] },
    });

    fixture = TestBed.createComponent(FacilityInformationPanel);
    fixture.componentRef.setInput('facility', FACILITY);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();

    patches = [];
    editTargets = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
    fixture.componentInstance.editTargetChanged.subscribe((target) => editTargets.push(target));
  });

  it('should render every stored value', () => {
    expect(root().textContent).toContain('Headquarters');
    expect(root().textContent).toContain('HQ-01');
    expect(root().textContent).toContain('1 Main Street');
    expect(root().textContent).toContain('48.8566, 2.3522');
  });

  it('should show a placeholder for an unset optional field', async () => {
    fixture.componentRef.setInput('facility', { ...FACILITY, code: null });
    await fixture.whenStable();

    expect(byTestId('facility-field-code')?.textContent).toContain('Not specified');
  });

  it('should render the type and parent rows read-only, with no editor trigger', () => {
    expect(byTestId('facility-field-type')?.querySelector('button')).toBeNull();
    expect(byTestId('facility-field-parent')?.querySelector('button')).toBeNull();
    expect(byTestId('facility-field-type')?.textContent).toContain('Building');
  });

  it('should link the parent row to the parent record when set', async () => {
    fixture.componentRef.setInput('facility', { ...FACILITY, parentFacilityId: 'parent-1' });
    await fixture.whenStable();

    const link: HTMLAnchorElement | null =
      byTestId('facility-field-parent')?.querySelector('a') ?? null;

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/facilities/parent-1');
  });

  it('should call a root facility out as such rather than linking nowhere', () => {
    expect(byTestId('facility-field-parent')?.querySelector('a')).toBeNull();
    expect(byTestId('facility-field-parent')?.textContent).toContain('Root facility');
  });

  it('should ask the page to open the name editor', () => {
    byTestId('facility-field-name')?.querySelector<HTMLButtonElement>('button')?.click();

    expect(editTargets).toEqual(['name']);
  });

  it('should send an empty code as null, not as an empty string', async () => {
    byTestId('facility-field-code')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'code' });
    await fixture.whenStable();

    const control: HTMLInputElement | null | undefined =
      byTestId('facility-field-code')?.querySelector<HTMLInputElement>('input');
    if (control) {
      control.value = '   ';
      control.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    saveButton()?.click();

    expect(patches).toEqual([{ code: null }]);
  });

  it('should refuse an empty draft for name, which is never optional', async () => {
    byTestId('facility-field-name')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'name' });
    await fixture.whenStable();

    const control: HTMLInputElement | null | undefined =
      byTestId('facility-field-name')?.querySelector<HTMLInputElement>('input');
    if (control) {
      control.value = '   ';
      control.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    expect(saveButton()?.hasAttribute('disabled')).toBe(true);
  });

  it('should not let a draft equal to the stored value be saved', async () => {
    byTestId('facility-field-address')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'address' });
    await fixture.whenStable();

    expect(saveButton()?.hasAttribute('disabled')).toBe(true);
  });

  it('should render each field row as a disabled trigger when not editable', async () => {
    fixture.componentRef.setInput('editable', false);
    await fixture.whenStable();

    const trigger = byTestId('facility-field-name')?.querySelector('button');
    expect(trigger?.hasAttribute('disabled')).toBe(true);
  });

  describe('levelIndex — floor only', () => {
    const levelIndexInput = (): HTMLInputElement | null =>
      byTestId('facility-field-level-index')?.querySelector<HTMLInputElement>('input') ?? null;

    const openLevelIndexOn = async (facility: FacilityOutput): Promise<void> => {
      fixture.componentRef.setInput('facility', facility);
      await fixture.whenStable();
      byTestId('facility-field-level-index')?.querySelector<HTMLButtonElement>('button')?.click();
      fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'levelIndex' });
      await fixture.whenStable();
    };

    it('should stay hidden for a non-floor facility', () => {
      expect(byTestId('facility-field-level-index')).toBeNull();
    });

    it('should show for a floor facility', async () => {
      fixture.componentRef.setInput('facility', { ...FACILITY, type: 'floor', levelIndex: 0 });
      await fixture.whenStable();

      expect(byTestId('facility-field-level-index')).not.toBeNull();
      expect(byTestId('facility-field-level-index')?.textContent).toContain('0');
    });

    it('should show a placeholder when unset', async () => {
      fixture.componentRef.setInput('facility', {
        ...FACILITY,
        type: 'floor',
        levelIndex: null,
      });
      await fixture.whenStable();

      expect(byTestId('facility-field-level-index')?.textContent).toContain('Not specified');
    });

    it('should send an empty draft as null, clearing the stored value', async () => {
      await openLevelIndexOn({ ...FACILITY, type: 'floor', levelIndex: 1 });

      const field: HTMLInputElement | null = levelIndexInput();
      if (field) {
        field.value = '';
        field.dispatchEvent(new Event('input'));
      }
      await fixture.whenStable();

      saveButton()?.click();

      expect(patches).toEqual([{ levelIndex: null }]);
    });

    it('should save a changed integer', async () => {
      await openLevelIndexOn({ ...FACILITY, type: 'floor', levelIndex: 1 });

      const field: HTMLInputElement | null = levelIndexInput();
      if (field) {
        field.value = '2';
        field.dispatchEvent(new Event('input'));
      }
      await fixture.whenStable();

      saveButton()?.click();

      expect(patches).toEqual([{ levelIndex: 2 }]);
    });

    it('should refuse a level index below -100', async () => {
      await openLevelIndexOn({ ...FACILITY, type: 'floor', levelIndex: 0 });

      const field: HTMLInputElement | null = levelIndexInput();
      if (field) {
        field.value = '-101';
        field.dispatchEvent(new Event('input'));
      }
      await fixture.whenStable();

      expect(saveButton()?.hasAttribute('disabled')).toBe(true);
    });

    it('should refuse a level index above 200', async () => {
      await openLevelIndexOn({ ...FACILITY, type: 'floor', levelIndex: 0 });

      const field: HTMLInputElement | null = levelIndexInput();
      if (field) {
        field.value = '201';
        field.dispatchEvent(new Event('input'));
      }
      await fixture.whenStable();

      expect(saveButton()?.hasAttribute('disabled')).toBe(true);
    });

    it('should not let an unchanged draft be saved', async () => {
      await openLevelIndexOn({ ...FACILITY, type: 'floor', levelIndex: 3 });

      expect(saveButton()?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('coordinates — both-or-neither', () => {
    const openCoordinatesOn = async (facility: FacilityOutput): Promise<void> => {
      fixture.componentRef.setInput('facility', facility);
      await fixture.whenStable();
      byTestId('facility-field-coordinates')?.querySelector<HTMLButtonElement>('button')?.click();
      fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'coordinates' });
      await fixture.whenStable();
    };

    it('should refuse to save while only one coordinate is filled', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      const [latitude] = coordinateInputs();
      latitude.value = '10';
      latitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(saveButton()?.hasAttribute('disabled')).toBe(true);
    });

    it('should say why, instead of only greying out Save', async () => {
      // The rule was enforced silently before: a latitude without a longitude
      // just disabled the button, leaving the user to work out that half a
      // pair is not half a location.
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      const [latitude] = coordinateInputs();
      latitude.value = '10';
      latitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      const error = byTestId('facility-coordinates-error');
      expect(error).not.toBeNull();
      expect(error?.getAttribute('role')).toBe('alert');
      expect(latitude.getAttribute('aria-invalid')).toBe('true');
    });

    it('should clear the explanation once the pair is complete', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      const [latitude, longitude] = coordinateInputs();
      latitude.value = '10';
      latitude.dispatchEvent(new Event('input'));
      longitude.value = '20';
      longitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(byTestId('facility-coordinates-error')).toBeNull();
    });

    it('should refuse an out-of-range coordinate', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      const [latitude, longitude] = coordinateInputs();
      latitude.value = '95';
      latitude.dispatchEvent(new Event('input'));
      longitude.value = '10';
      longitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(saveButton()?.hasAttribute('disabled')).toBe(true);
    });

    it('should save a changed, matching pair as numbers', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      const [latitude, longitude] = coordinateInputs();
      latitude.value = '10';
      latitude.dispatchEvent(new Event('input'));
      longitude.value = '20';
      longitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      saveButton()?.click();

      expect(patches).toEqual([{ latitude: 10, longitude: 20 }]);
    });

    it('should save both cleared as null, since a facility with coordinates can be un-located', async () => {
      byTestId('facility-field-coordinates')?.querySelector<HTMLButtonElement>('button')?.click();
      fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'coordinates' });
      await fixture.whenStable();

      const [latitude, longitude] = coordinateInputs();
      latitude.value = '';
      latitude.dispatchEvent(new Event('input'));
      longitude.value = '';
      longitude.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      saveButton()?.click();

      expect(patches).toEqual([{ latitude: null, longitude: null }]);
    });
  });

  describe('the "Locate address" lookup', () => {
    const openCoordinates = async (facility: FacilityOutput = FACILITY): Promise<void> => {
      fixture.componentRef.setInput('facility', facility);
      fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'coordinates' });
      await fixture.whenStable();
    };

    const locateButton = (): HTMLButtonElement | null =>
      byTestId('facility-locate-address') as HTMLButtonElement | null;

    it('should emit geocodeRequested with the stored address', async () => {
      const requested: string[] = [];
      fixture.componentInstance.geocodeRequested.subscribe((value) => requested.push(value));

      await openCoordinates();
      locateButton()?.click();
      await fixture.whenStable();

      expect(requested).toEqual(['1 Main Street']);
    });

    it('should not offer the lookup while the record has no address', async () => {
      await openCoordinates({ ...FACILITY, address: null });

      expect(locateButton()).toBeNull();
    });

    it('should be inert but focusable while a lookup is in flight', async () => {
      const requested: string[] = [];
      fixture.componentInstance.geocodeRequested.subscribe((value) => requested.push(value));

      await openCoordinates();
      fixture.componentRef.setInput('geocodePending', true);
      await fixture.whenStable();

      expect(locateButton()?.getAttribute('aria-disabled')).toBe('true');
      expect(locateButton()?.disabled).toBe(false);

      locateButton()?.click();
      await fixture.whenStable();

      expect(requested).toEqual([]);
      expect(byTestId('facility-geocode-status')?.textContent).toContain('Locating address…');
    });

    it('should fill both coordinate drafts from a match, leaving Save to commit them', async () => {
      await openCoordinates();
      fixture.componentRef.setInput('geocodeResult', {
        '@id': '/api/organizations/org-1/facilities/geocode',
        '@type': 'GeocodeAddress',
        displayName: '1 Main Street, Springfield',
        latitude: 12.5,
        longitude: -7.25,
      });
      await fixture.whenStable();

      const [latitude, longitude] = coordinateInputs();

      expect(latitude.value).toBe('12.5');
      expect(longitude.value).toBe('-7.25');
      expect(patches).toEqual([]);
      expect(byTestId('facility-geocode-status')?.textContent).toContain(
        '1 Main Street, Springfield',
      );
    });

    it('should announce a 404 as a non-blocking inline message in the live region', async () => {
      await openCoordinates();
      fixture.componentRef.setInput('geocodeNotFound', true);
      await fixture.whenStable();

      const status: HTMLElement | null = byTestId('facility-geocode-status');

      expect(status?.getAttribute('aria-live')).toBe('polite');
      expect(status?.textContent).toContain('Address not found');
    });
  });

  describe('the "Pick on map" picker', () => {
    const openCoordinatesOn = async (facility: FacilityOutput): Promise<void> => {
      fixture.componentRef.setInput('facility', facility);
      await fixture.whenStable();
      byTestId('facility-field-coordinates')?.querySelector<HTMLButtonElement>('button')?.click();
      fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'coordinates' });
      await fixture.whenStable();
    };

    it('should open the picker dialog from the coordinates editor', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: 48.8566, longitude: 2.3522 });

      const trigger: HTMLElement | null = byTestId('facility-pick-on-map');
      expect(trigger).not.toBeNull();

      trigger?.click();
      await fixture.whenStable();

      expect(picker().visible()).toBe(true);
      expect(picker().center()).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    });

    it('should ask the picker to open on nothing in particular when no coordinates are set', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      byTestId('facility-pick-on-map')?.click();
      await fixture.whenStable();

      expect(picker().visible()).toBe(true);
      expect(picker().center()).toBeUndefined();
    });

    it('should fill both coordinate drafts from a pick, leaving Save to commit them', async () => {
      await openCoordinatesOn({ ...FACILITY, latitude: null, longitude: null });

      (
        fixture.componentInstance as unknown as {
          onMapPicked(coordinates: MapCoordinates): void;
        }
      ).onMapPicked({ latitude: 10, longitude: 20 });
      await fixture.whenStable();

      const [latitude, longitude] = coordinateInputs();
      expect(latitude.value).toBe('10');
      expect(longitude.value).toBe('20');
      expect(patches).toEqual([]);
    });
  });
});

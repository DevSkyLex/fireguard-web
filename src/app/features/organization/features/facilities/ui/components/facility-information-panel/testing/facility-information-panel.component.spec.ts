import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  FacilityEditState,
  FacilityEditTarget,
  FacilityOutput,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import { FacilityInformationPanel } from '../facility-information-panel.component';

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

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
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

    const input: HTMLInputElement | null | undefined =
      byTestId('facility-field-code')?.querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = '   ';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    saveButton()?.click();

    expect(patches).toEqual([{ code: null }]);
  });

  it('should refuse an empty draft for name, which is never optional', async () => {
    byTestId('facility-field-name')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'name' });
    await fixture.whenStable();

    const input: HTMLInputElement | null | undefined =
      byTestId('facility-field-name')?.querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = '   ';
      input.dispatchEvent(new Event('input'));
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
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  EquipmentEditState,
  EquipmentEditTarget,
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import { EquipmentInformationPanel } from '../equipment-information-panel.component';

const IDLE_EDIT_STATE: EquipmentEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

const EQUIPMENT: EquipmentOutput = {
  '@id': '/api/organizations/org-1/equipment/equipment-1',
  '@type': 'Equipment',
  id: 'equipment-1',
  organizationId: 'org-1',
  facilityId: null,
  facilityName: null,
  type: 'fire_extinguisher',
  subType: 'CO2',
  brand: 'Kidde',
  model: 'Pro 210',
  serialNumber: 'SN-1',
  locationLabel: 'Floor 2',
  status: 'operational',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  maintenanceDueStatus: 'up_to_date',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('EquipmentInformationPanel', () => {
  let fixture: ComponentFixture<EquipmentInformationPanel>;
  let patches: UpdateEquipmentInput[];
  let editTargets: (EquipmentEditTarget | null)[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);
  const saveButton = (): HTMLButtonElement | undefined =>
    Array.from(root().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Save',
    );

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentInformationPanel);
    fixture.componentRef.setInput('equipment', EQUIPMENT);
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('editState', IDLE_EDIT_STATE);
    await fixture.whenStable();

    patches = [];
    editTargets = [];
    fixture.componentInstance.detailsChanged.subscribe((patch) => patches.push(patch));
    fixture.componentInstance.editTargetChanged.subscribe((target) => editTargets.push(target));
  });

  it('should render every stored value', () => {
    expect(root().textContent).toContain('CO2');
    expect(root().textContent).toContain('Kidde');
    expect(root().textContent).toContain('Pro 210');
    expect(root().textContent).toContain('SN-1');
    expect(root().textContent).toContain('Floor 2');
  });

  it('should show a placeholder for an unset text field', async () => {
    fixture.componentRef.setInput('equipment', { ...EQUIPMENT, subType: null });
    await fixture.whenStable();

    expect(byTestId('equipment-field-subtype')?.textContent).toContain('Not specified');
  });

  it('should ask the page to open the brand editor', () => {
    byTestId('equipment-field-brand')?.querySelector<HTMLButtonElement>('button')?.click();

    expect(editTargets).toEqual(['brand']);
  });

  it('should send an empty brand as null, not as an empty string', async () => {
    byTestId('equipment-field-brand')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'brand' });
    await fixture.whenStable();

    const input: HTMLInputElement | null | undefined =
      byTestId('equipment-field-brand')?.querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = '   ';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    saveButton()?.click();

    expect(patches).toEqual([{ brand: null }]);
  });

  it('should not let a draft equal to the stored value be saved', async () => {
    byTestId('equipment-field-model')?.querySelector<HTMLButtonElement>('button')?.click();
    fixture.componentRef.setInput('editState', { ...IDLE_EDIT_STATE, open: 'model' });
    await fixture.whenStable();

    expect(saveButton()?.hasAttribute('disabled')).toBe(true);
  });

  it('should render each field row as a disabled trigger when not editable', async () => {
    fixture.componentRef.setInput('editable', false);
    await fixture.whenStable();

    const trigger = byTestId('equipment-field-serial')?.querySelector('button');
    expect(trigger?.hasAttribute('disabled')).toBe(true);
  });
});

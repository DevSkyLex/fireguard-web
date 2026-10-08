import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import { EquipmentCharacteristicsForm } from '../equipment-characteristics-form.component';

describe('EquipmentCharacteristicsForm', () => {
  let fixture: ComponentFixture<EquipmentCharacteristicsForm>;
  const equipment = {
    '@id': '/api/equipment/eq',
    '@type': 'Equipment',
    id: 'eq',
    organizationId: 'org',
    facilityId: null,
    facilityName: null,
    type: 'fire_extinguisher',
    subType: null,
    brand: null,
    model: null,
    serialNumber: null,
    locationLabel: null,
    status: 'operational',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    technicalProperties: [{ key: 'Capacity', value: '6', unit: 'kg' }],
    criticality: 'high',
  } as EquipmentOutput;
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(EquipmentCharacteristicsForm);
    fixture.componentRef.setInput('equipment', equipment);
    await fixture.whenStable();
  });
  const submit = async () => {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  it('normalizes declared values and optional units without deriving any obligation', async () => {
    const values: UpdateEquipmentInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => values.push(value));
    fixture.componentInstance['draft'].set({
      criticality: '',
      properties: [{ key: ' Capacity ', value: ' 6 ', unit: ' ' }],
    });
    await fixture.whenStable();
    await submit();
    expect(values).toEqual([
      { criticality: null, technicalProperties: [{ key: 'Capacity', value: '6', unit: null }] },
    ]);
  });

  it('rejects duplicate keys after normalization and preserves both rows for correction', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance['draft'].set({
      criticality: 'high',
      properties: [
        { key: 'Capacity', value: '6', unit: 'kg' },
        { key: ' Capacity ', value: '7', unit: 'kg' },
      ],
    });
    await fixture.whenStable();
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Characteristic names must be unique.');
    expect(fixture.componentInstance['draft']().properties).toHaveLength(2);
  });

  it('rejects whitespace-only values instead of sending a misleading empty characteristic', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance['draft'].set({
      criticality: '',
      properties: [{ key: ' ', value: ' ', unit: '' }],
    });
    await fixture.whenStable();
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter a characteristic name.');
    expect(fixture.nativeElement.textContent).toContain('Enter a value.');
  });

  it('preserves the edited draft after a server refusal and locks it only while pending', async () => {
    fixture.componentInstance['draft'].set({
      criticality: 'low',
      properties: [{ key: 'Capacity', value: '9', unit: 'kg' }],
    });
    fixture.componentRef.setInput('error', 'Equipment revision has changed.');
    await fixture.whenStable();
    expect(fixture.componentInstance['draft']().properties[0].value).toBe('9');
    expect(fixture.nativeElement.textContent).toContain('Equipment revision has changed.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input').disabled).toBe(true);
  });

  it('keeps a dirty characteristics draft when an unrelated site update refreshes the same equipment', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const value = root.querySelector<HTMLInputElement>('#equipment-property-value-0');
    if (!value) throw new Error('Characteristic value was not rendered');
    value.value = '12';
    value.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.componentRef.setInput('equipment', { ...equipment, facilityId: 'other-site' });
    await fixture.whenStable();
    expect(fixture.componentInstance['draft']().properties[0].value).toBe('12');
  });
});

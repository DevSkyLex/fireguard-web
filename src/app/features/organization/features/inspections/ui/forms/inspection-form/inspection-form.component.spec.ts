import { TestBed } from '@angular/core/testing';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionForm } from './inspection-form.component';
import type { InspectionFormValues } from './models';

const MOCK_EQUIPMENT: EquipmentOutput = {
  '@id': '/api/equipment/equip-1',
  '@type': 'Equipment',
  id: 'equip-1',
  organizationId: 'org-1',
  facilityId: null,
  type: 'extinguisher',
  subType: null,
  brand: 'Acme',
  model: null,
  serialNumber: 'SN-01',
  locationLabel: null,
  status: 'operational',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as EquipmentOutput;

const MOCK_FACILITY: FacilityOutput = {
  '@id': '/api/facilities/facility-1',
  '@type': 'Facility',
  id: 'facility-1',
  organizationId: 'org-1',
  parentFacilityId: null,
  hasChildren: false,
  type: 'site',
  name: 'Main Site',
  code: 'MS-01',
  status: 'active',
  address: null,
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as FacilityOutput;

const MOCK_INSPECTION: InspectionOutput = {
  '@id': '/api/inspections/inspection-1',
  '@type': 'Inspection',
  id: 'inspection-1',
  organizationId: 'org-1',
  equipmentId: 'equip-1',
  facilityId: 'facility-1',
  result: 'pass',
  status: 'draft',
  performedAt: '2026-01-05T10:00:00.000Z',
  inspector: {
    type: 'user',
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    avatarUrl: null,
    organizationName: null,
  },
  checklistId: null,
  notes: 'Looks good',
  signature: null,
  nonConformitiesCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-05T10:00:00.000Z',
} as InspectionOutput;

describe('InspectionForm', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectionForm],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the create-mode submit label by default', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create Inspection');
  });

  it('should not emit submitted when the form is invalid', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit submitted with raw form values when the form is valid', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.componentRef.setInput('equipments', [MOCK_EQUIPMENT]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    const performedAt = new Date('2026-01-10T09:00:00.000Z');

    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(values: InspectionFormValues): void;
      };
    };
    component.form.setValue({
      equipmentId: 'equip-1',
      result: 'pass',
      performedAt,
      inspectorType: 'user',
      inspectorName: 'John Doe',
      facilityId: '',
      checklistId: '',
      notes: '',
      signature: '',
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      equipmentId: 'equip-1',
      result: 'pass',
      performedAt,
      inspectorType: 'user',
      inspectorName: 'John Doe',
      facilityId: '',
      checklistId: '',
      notes: '',
      signature: '',
    });
  });

  it('should emit cancelled when cancel is invoked', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.detectChanges();
    const emitSpy = vi.spyOn(fixture.componentInstance.cancelled, 'emit');

    fixture.componentInstance['onCancel']();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('should disable the form while loading', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { form: { disabled: boolean } };
    expect(component.form.disabled).toBe(true);
  });

  it('should patch form values and render the edit-mode label when an inspection is provided', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.componentRef.setInput('inspection', MOCK_INSPECTION);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: { value: Partial<InspectionFormValues> };
    };
    expect(component.form.value.equipmentId).toBe('equip-1');
    expect(component.form.value.inspectorName).toBe('Jane Doe');
    expect(component.form.value.notes).toBe('Looks good');
    expect(fixture.nativeElement.textContent).toContain('Save changes');
  });

  it('should map equipment, facility and checklist inputs into select options', () => {
    const fixture = TestBed.createComponent(InspectionForm);
    fixture.componentRef.setInput('equipments', [MOCK_EQUIPMENT]);
    fixture.componentRef.setInput('facilities', [MOCK_FACILITY]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      equipmentOptions: { label: string; value: string }[];
      facilityOptions: { label: string; value: string }[];
    };
    expect(component.equipmentOptions).toEqual([
      { label: 'extinguisher — Acme (SN-01)', value: 'equip-1' },
    ]);
    expect(component.facilityOptions).toEqual([
      { label: 'None', value: '' },
      { label: 'Main Site (MS-01)', value: 'facility-1' },
    ]);
  });
});

import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionInformationPanel } from '../inspection-information-panel.component';

const EQUIPMENT_ID = '550e8400-e29b-41d4-a716-446655440020';
const FACILITY_ID = '550e8400-e29b-41d4-a716-446655440010';

const inspection = (overrides: Partial<InspectionOutput> = {}): InspectionOutput =>
  ({
    id: 'ins-1',
    organizationId: 'org-1',
    equipmentId: EQUIPMENT_ID,
    facilityId: FACILITY_ID,
    equipmentSerialNumber: 'SN-4711',
    facilityName: 'Northgate Plant',
    result: 'pass',
    status: 'closed',
    performedAt: '2026-02-12T10:00:00Z',
    checklistId: 'chk-1',
    checklistName: 'Quarterly extinguisher check',
    notes: null,
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-02-12T10:00:00Z',
    updatedAt: '2026-02-12T10:00:00Z',
    ...overrides,
  }) as InspectionOutput;

const createComponent = (value: InspectionOutput): ComponentFixture<InspectionInformationPanel> => {
  TestBed.configureTestingModule({ imports: [InspectionInformationPanel] });

  const fixture = TestBed.createComponent(InspectionInformationPanel);
  fixture.componentRef.setInput('inspection', value);
  fixture.detectChanges();
  return fixture;
};

describe('InspectionInformationPanel', () => {
  // The panel used to print raw UUIDs. The serial number is what is written on
  // the device the agent is standing in front of.
  it('should name the equipment by its serial number and the facility by name', () => {
    const text: string = createComponent(inspection()).nativeElement.textContent ?? '';

    expect(text).toContain('SN-4711');
    expect(text).toContain('Northgate Plant');
    expect(text).not.toContain(EQUIPMENT_ID);
    expect(text).not.toContain(FACILITY_ID);
  });

  // An inspection whose subject cannot be named still has to say which one it
  // was — the identifier is the last resort, not the default.
  it('should fall back to the identifier when no serial number resolved', () => {
    const text: string =
      createComponent(inspection({ equipmentSerialNumber: null })).nativeElement.textContent ?? '';

    expect(text).toContain(EQUIPMENT_ID);
    expect(text).not.toContain('SN-4711');
  });

  it('should fall back to the identifier when no facility name resolved', () => {
    const text: string =
      createComponent(inspection({ facilityName: null })).nativeElement.textContent ?? '';

    expect(text).toContain(FACILITY_ID);
  });

  it('should name the checklist the inspection followed', () => {
    const text: string = createComponent(inspection()).nativeElement.textContent ?? '';

    expect(text).toContain('Quarterly extinguisher check');
    expect(text).not.toContain('chk-1');
  });

  it('should say nothing rather than blank when the inspection has no facility', () => {
    const fixture = createComponent(inspection({ facilityName: null, facilityId: null }));

    expect(
      fixture.nativeElement.querySelector('[data-testid="inspection-facility-name"]'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(FACILITY_ID);
  });
});

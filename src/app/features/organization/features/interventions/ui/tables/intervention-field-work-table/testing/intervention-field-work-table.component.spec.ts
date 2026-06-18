import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';
import { InterventionFieldWorkTable } from '../intervention-field-work-table.component';
import type { FieldWorkRow } from '../models';

type InterventionFieldWorkTableHarness = {
  rowItems(): readonly FieldWorkRow[];
  onAttachPhoto(row: FieldWorkRow): void;
  onSkip(row: FieldWorkRow): void;
  readonly attachPhoto: {
    subscribe(listener: (value: InterventionWorkItemOutput) => void): { unsubscribe(): void };
  };
  readonly skip: {
    subscribe(listener: (value: InterventionWorkItemOutput) => void): { unsubscribe(): void };
  };
};

const equipmentItem = {
  id: 'wi-1',
  action: 'inventory',
  target: '/api/equipment/eq-1',
  source: 'planned',
  status: 'planned',
} as unknown as InterventionWorkItemOutput;

const discoveredItem = {
  id: 'wi-2',
  action: 'inspection',
  target: '/api/facilities/f-1',
  source: 'discovered',
  status: 'completed',
} as unknown as InterventionWorkItemOutput;

describe('InterventionFieldWorkTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionFieldWorkTable],
    }).overrideComponent(InterventionFieldWorkTable, {
      set: {
        imports: [ReactiveFormsModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function build(
    workItems: readonly InterventionWorkItemOutput[],
  ): InterventionFieldWorkTableHarness {
    const fixture = TestBed.createComponent(InterventionFieldWorkTable);
    fixture.componentRef.setInput('workItems', workItems);
    fixture.componentRef.setInput('canExecute', true);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionFieldWorkTableHarness;
  }

  it('should create', () => {
    expect(build([])).toBeTruthy();
  });

  it('should flag equipment targets and skippable items in the projected rows', () => {
    const rows = build([equipmentItem]).rowItems();

    expect(rows).toHaveLength(1);
    expect(rows[0].isEquipment).toBe(true);
    expect(rows[0].canSkip).toBe(true);
    expect(rows[0].source).toBe('planned');
  });

  it('should not flag a non-equipment, resolved item as photographable or skippable', () => {
    const rows = build([discoveredItem]).rowItems();

    expect(rows[0].isEquipment).toBe(false);
    expect(rows[0].canSkip).toBe(false);
    expect(rows[0].targetLabel).toBeNull();
  });

  it('should emit the underlying work item when a row photo action is triggered', () => {
    const harness = build([equipmentItem]);
    let emitted: InterventionWorkItemOutput | undefined;
    harness.attachPhoto.subscribe((value) => (emitted = value));

    harness.onAttachPhoto(harness.rowItems()[0]);

    expect(emitted).toBe(equipmentItem);
  });

  it('should emit the underlying work item when a row skip action is triggered', () => {
    const harness = build([equipmentItem]);
    let emitted: InterventionWorkItemOutput | undefined;
    harness.skip.subscribe((value) => (emitted = value));

    harness.onSkip(harness.rowItems()[0]);

    expect(emitted).toBe(equipmentItem);
  });
});

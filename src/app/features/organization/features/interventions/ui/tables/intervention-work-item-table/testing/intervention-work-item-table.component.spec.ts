import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import {
  resolveInterventionTag,
  type InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionWorkItemTable } from '../intervention-work-item-table.component';
import type { WorkItemRow } from '../models';

type InterventionWorkItemTableHarness = {
  readonly columnCount: () => number;
  readonly rowItems: () => readonly WorkItemRow[];
  readonly selectedRows: {
    (): readonly WorkItemRow[];
    set(rows: readonly WorkItemRow[]): void;
  };
  onDeleteSelected(): void;
  onClearSelection(): void;
  readonly deleteWorkItems: {
    subscribe(listener: (value: readonly InterventionWorkItemOutput[]) => void): {
      unsubscribe(): void;
    };
  };
};

const workItem = {
  id: 'wi-1',
  action: 'inspection',
  target: null,
  status: 'planned',
  targetSummary: null,
  assigneeProfile: null,
  assignee: null,
} as unknown as InterventionWorkItemOutput;

describe('InterventionWorkItemTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionWorkItemTable],
    }).overrideComponent(InterventionWorkItemTable, {
      set: {
        imports: [ReactiveFormsModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(canDelete = false): InterventionWorkItemTableHarness {
    const fixture = TestBed.createComponent(InterventionWorkItemTable);
    fixture.componentRef.setInput('workItems', [workItem]);
    fixture.componentRef.setInput('canDelete', canDelete);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionWorkItemTableHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should project work items into flat, resolved rows', () => {
    const component = createComponent();
    const [row] = component.rowItems();

    expect(row.id).toBe('wi-1');
    expect(row.actionLabel).toBe(resolveInterventionTag('workItemAction', 'inspection').label);
    expect(row.targetLabel).toBeNull();
    expect(row.assignee).toBeNull();
    expect(row.assigneeName).toBe('');
    expect(row.status).toBe('planned');
  });

  it('should add the selection and action columns only when deletion is allowed', () => {
    expect(createComponent(false).columnCount()).toBe(4);
    expect(createComponent(true).columnCount()).toBe(6);
  });

  it('should emit the selected work items for deletion and support clearing the selection', () => {
    const component = createComponent(true);
    const [row] = component.rowItems();
    let emitted: readonly InterventionWorkItemOutput[] | undefined;
    component.deleteWorkItems.subscribe((value) => (emitted = value));

    component.selectedRows.set([row]);
    component.onDeleteSelected();
    expect(emitted).toEqual([workItem]);

    component.onClearSelection();
    expect(component.selectedRows()).toEqual([]);
  });
});

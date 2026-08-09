import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import { InterventionWorkItemTable } from '../intervention-work-item-table.component';

const baseItem: InterventionWorkItemOutput = {
  '@id': '/api/intervention-work-items/wi-1',
  '@type': 'InterventionWorkItem',
  id: 'wi-1',
  intervention: '/api/interventions/intervention-1',
  action: 'inspection',
  target: '/api/equipment/eq-1',
  targetSummary: { resource: '/api/equipment/eq-1', kind: 'equipment', label: 'Extinguisher A-12' },
  resultResource: null,
  assignee: null,
  assigneeProfile: null,
  source: 'planned',
  status: 'planned',
  required: true,
  skipReason: null,
  revision: 1,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
};

const item = (overrides: Partial<InterventionWorkItemOutput>): InterventionWorkItemOutput => ({
  ...baseItem,
  ...overrides,
});

describe('InterventionWorkItemTable', () => {
  let fixture: ComponentFixture<InterventionWorkItemTable>;
  let changes: InterventionWorkItemStatusChange[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] =>
    Array.from(root().querySelectorAll('[data-testid="intervention-work-item-row"]'));
  const toggles = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll('[data-testid="intervention-work-item-toggle"]'));
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionWorkItemTable);
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-1', status: 'completed' }),
      item({ id: 'wi-2', status: 'planned' }),
      item({ id: 'wi-3', status: 'skipped', skipReason: 'Access blocked by pallets.' }),
      item({ id: 'wi-4', status: 'in_progress' }),
    ]);
    fixture.componentRef.setInput('canToggle', true);
    await fixture.whenStable();

    changes = [];
    fixture.componentInstance.statusChanged.subscribe((change) => changes.push(change));
  });

  it('should count completed and skipped alike as resolved', () => {
    expect(root().textContent).toContain('2/4');
  });

  it('should name each row by its action and target', () => {
    expect(rows()[0]?.textContent).toContain('Inspection');
    expect(rows()[0]?.textContent).toContain('Extinguisher A-12');
  });

  it('should name an item with no target by its action alone', async () => {
    // API Platform omits null fields: an unset target arrives as `undefined`,
    // which a `=== null` guard would let through as the string "undefined".
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-9', action: 'inventory', target: undefined, targetSummary: undefined }),
    ]);
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Inventory');
    expect(rows()[0]?.textContent).not.toContain('undefined');
    expect(rows()[0]?.textContent).not.toContain('·');
  });

  it('should not print a bare IRI as a target', async () => {
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-9', target: '/api/equipment/eq-7', targetSummary: null }),
    ]);
    await fixture.whenStable();

    expect(rows()[0]?.textContent).not.toContain('/api/equipment');
  });

  it('should show a free-text target as typed', async () => {
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-9', target: 'Boiler room B', targetSummary: null }),
    ]);
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Boiler room B');
  });

  it('should show why an item was skipped', () => {
    expect(rows()[2]?.textContent).toContain('Access blocked by pallets.');
  });

  it('should show the assignee as an avatar and name, not text alone', async () => {
    fixture.componentRef.setInput('items', [
      item({
        id: 'wi-9',
        assigneeProfile: {
          member: '/api/organization-members/m-1',
          userId: 'u-1',
          displayName: 'Jane Doe',
          avatarUrl: null,
        },
      }),
    ]);
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Jane Doe');
    expect(rows()[0]?.textContent).toContain('JD');
  });

  it('should show nothing in the assignee column when the item is unassigned', () => {
    expect(rows()[0]?.textContent).not.toMatch(/JD|Jane/);
  });

  it('should show the work item state as its own badge column', () => {
    expect(rows()[0]?.textContent).toContain('Completed');
    expect(rows()[1]?.textContent).toContain('Planned');
  });

  it('should tell a planned item apart from one discovered in the field', async () => {
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-1', source: 'planned' }),
      item({ id: 'wi-2', source: 'discovered' }),
    ]);
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Planned');
    expect(rows()[1]?.textContent).toContain('Discovered');
  });

  it('should give every state its own glyph, not a colour', () => {
    // Compare the rendered paths: four states must be four distinct shapes.
    const shapes: string[] = toggles().map(
      (toggle) => toggle.querySelector('ng-icon svg')?.innerHTML ?? '',
    );

    expect(new Set(shapes).size).toBe(4);
  });

  it('should complete a planned item in one gesture', () => {
    toggles()[1]?.click();

    expect(changes).toEqual([{ workItemId: 'wi-2', status: 'completed' }]);
  });

  it('should reopen a completed item', () => {
    toggles()[0]?.click();

    expect(changes).toEqual([{ workItemId: 'wi-1', status: 'planned' }]);
  });

  it('should not toggle a skipped item, which was resolved with a reason', () => {
    expect(toggles()[2]?.disabled).toBe(true);

    toggles()[2]?.click();

    expect(changes).toEqual([]);
  });

  it('should lock only the row whose own write is in flight', async () => {
    fixture.componentRef.setInput('pendingItemId', 'wi-2');
    await fixture.whenStable();

    // wi-2 is saving; wi-1 and wi-4 stay live so an agent can keep ticking.
    // (wi-3 is skipped, and disabled for its own reason.)
    expect(toggles()[1]?.disabled).toBe(true);
    expect(toggles()[0]?.disabled).toBe(false);
    expect(toggles()[3]?.disabled).toBe(false);
  });

  it('should spin on the saving row, and only there', async () => {
    fixture.componentRef.setInput('pendingItemId', 'wi-2');
    await fixture.whenStable();

    expect(toggles()[1]?.querySelector('hlm-spinner')).not.toBeNull();
    expect(toggles()[1]?.getAttribute('aria-busy')).toBe('true');
    expect(toggles()[0]?.querySelector('hlm-spinner')).toBeNull();
  });

  it('should not lock any toggle merely because some other write is in flight', async () => {
    // The store queues these writes with mergeMap precisely so they can overlap;
    // a table that froze on `busy` would throw that away.
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(toggles()[0]?.disabled).toBe(false);
    expect(toggles()[1]?.disabled).toBe(false);
  });

  it('should still hold the add affordance back while a write is in flight', async () => {
    fixture.componentRef.setInput('canAdd', true);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect((byTestId('intervention-work-items-add') as HTMLButtonElement | null)?.disabled).toBe(
      true,
    );
  });

  it('should not toggle at all without the permission', async () => {
    fixture.componentRef.setInput('canToggle', false);
    await fixture.whenStable();

    expect(toggles().every((toggle) => toggle.disabled)).toBe(true);
  });

  it('should mark the next item with a badge and a landmark, not colour alone', async () => {
    fixture.componentRef.setInput('nextItemId', 'wi-4');
    await fixture.whenStable();

    expect(rows()[3]?.getAttribute('aria-current')).toBe('step');
    expect(rows()[3]?.textContent).toContain('Next');
  });

  it('should tint only the next row, not colour alone since it also carries aria-current', async () => {
    fixture.componentRef.setInput('nextItemId', 'wi-4');
    await fixture.whenStable();

    expect(rows()[3]?.className).toContain('border-primary');
    expect(rows()[0]?.className).not.toContain('border-primary');
  });

  it('should offer no row menu when nothing is permitted', () => {
    expect(byTestId('intervention-work-item-menu')).toBeNull();
  });

  it('should offer a skip only while the item is unresolved', async () => {
    fixture.componentRef.setInput('canSkip', true);
    await fixture.whenStable();

    // Only the planned and in-progress rows carry a menu.
    expect(root().querySelectorAll('[data-testid="intervention-work-item-menu"]')).toHaveLength(2);
  });

  it('should offer a removal only for planned work, never for a field discovery', async () => {
    fixture.componentRef.setInput('items', [
      item({ id: 'wi-1', source: 'planned' }),
      item({ id: 'wi-2', source: 'discovered' }),
    ]);
    fixture.componentRef.setInput('canDelete', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('[data-testid="intervention-work-item-menu"]')).toHaveLength(1);
  });

  it('should invite the first item when the scope is empty and writable', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('canAdd', true);
    await fixture.whenStable();

    expect(byTestId('intervention-work-items-empty')?.textContent).toContain(
      'List the tasks to complete during this intervention.',
    );
    expect(byTestId('intervention-work-items-empty-add')).not.toBeNull();
  });

  it('should not invite work a reader cannot add', async () => {
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();

    expect(byTestId('intervention-work-items-empty')?.textContent).toContain(
      'A planner has not listed the field work yet.',
    );
    expect(byTestId('intervention-work-items-empty-add')).toBeNull();
  });

  it('should ask the page to add rather than adding anything itself', async () => {
    let requests: number = 0;
    fixture.componentInstance.addRequested.subscribe(() => (requests += 1));
    fixture.componentRef.setInput('canAdd', true);
    await fixture.whenStable();

    (byTestId('intervention-work-items-add') as HTMLButtonElement).click();

    expect(requests).toBe(1);
  });
});

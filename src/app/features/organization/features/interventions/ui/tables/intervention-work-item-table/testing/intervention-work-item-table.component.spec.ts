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
  evidenceCount: 0,
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
    fixture.componentRef.setInput('pendingItemIds', new Set(['wi-2']));
    await fixture.whenStable();

    // wi-2 is saving; wi-1 and wi-4 stay live so an agent can keep ticking.
    // (wi-3 is skipped, and disabled for its own reason.)
    expect(toggles()[1]?.disabled).toBe(true);
    expect(toggles()[0]?.disabled).toBe(false);
    expect(toggles()[3]?.disabled).toBe(false);
  });

  it('should spin on the saving row, and only there', async () => {
    fixture.componentRef.setInput('pendingItemIds', new Set(['wi-2']));
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

  it('should show each filter chip with the count it would produce', () => {
    expect(byTestId('intervention-work-items-filter-all')?.textContent).toContain('4');
    expect(byTestId('intervention-work-items-filter-remaining')?.textContent).toContain('2');
    expect(byTestId('intervention-work-items-filter-done')?.textContent).toContain('1');
    expect(byTestId('intervention-work-items-filter-skipped')?.textContent).toContain('1');
  });

  it('should narrow the rows to the picked chip', async () => {
    (byTestId('intervention-work-items-filter-done') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.textContent).toContain('Completed');
  });

  it('should show a filtered-empty state distinct from a truly empty scope', async () => {
    fixture.componentRef.setInput('items', [item({ id: 'wi-1', status: 'planned' })]);
    await fixture.whenStable();

    (byTestId('intervention-work-items-filter-done') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(byTestId('intervention-work-items-filtered-empty')).not.toBeNull();
    expect(byTestId('intervention-work-items-empty')).toBeNull();
  });

  it('should offer no "Mine first" toggle without a known member', () => {
    expect(byTestId('intervention-work-items-mine-first')).toBeNull();
  });

  it('should offer no "Mine first" toggle when the member has nothing assigned', async () => {
    fixture.componentRef.setInput('currentMemberId', '/api/organizations/org-1/members/m-1');
    await fixture.whenStable();

    expect(byTestId('intervention-work-items-mine-first')).toBeNull();
  });

  it('should pull the member’s own rows first once "Mine first" is on', async () => {
    fixture.componentRef.setInput('items', [
      item({
        id: 'wi-1',
        status: 'planned',
        target: 'Not mine',
        targetSummary: null,
        assignee: '/api/organizations/org-1/members/m-2',
      }),
      item({
        id: 'wi-2',
        status: 'planned',
        target: 'Mine',
        targetSummary: null,
        assignee: '/api/organizations/org-1/members/m-1',
      }),
    ]);
    fixture.componentRef.setInput('currentMemberId', '/api/organizations/org-1/members/m-1');
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Not mine');

    (byTestId('intervention-work-items-mine-first') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(rows()[0]?.textContent).toContain('Mine');
    expect(rows()[1]?.textContent).toContain('Not mine');
  });

  it('should render the progress bar and count only when the page asks for it', async () => {
    expect(byTestId('intervention-work-items-progress')).toBeNull();

    fixture.componentRef.setInput('showProgress', true);
    fixture.componentRef.setInput('totalCount', 10);
    fixture.componentRef.setInput('completedCount', 4);
    await fixture.whenStable();

    expect(byTestId('intervention-work-items-progress')?.textContent).toContain('4/10');
  });

  it('should hide the evidence affordance when the page does not allow it', () => {
    expect(byTestId('intervention-work-item-evidence')).toBeNull();
  });

  it('should show the evidence affordance without a count badge when the row has no evidence yet', async () => {
    fixture.componentRef.setInput('canAttachEvidence', true);
    await fixture.whenStable();

    const button = byTestId('intervention-work-item-evidence');
    expect(button).not.toBeNull();
    expect(byTestId('intervention-work-item-evidence-count')).toBeNull();
  });

  it('should show the row’s evidence count as a badge once it has files', async () => {
    fixture.componentRef.setInput('items', [item({ id: 'wi-1', evidenceCount: 3 })]);
    fixture.componentRef.setInput('canAttachEvidence', true);
    await fixture.whenStable();

    expect(byTestId('intervention-work-item-evidence-count')?.textContent?.trim()).toBe('3');
  });

  it('should emit evidenceRequested with the row’s item on click', async () => {
    fixture.componentRef.setInput('canAttachEvidence', true);
    await fixture.whenStable();

    const requested: InterventionWorkItemOutput[] = [];
    fixture.componentInstance.evidenceRequested.subscribe((requestedItem) =>
      requested.push(requestedItem),
    );

    (byTestId('intervention-work-item-evidence') as HTMLButtonElement).click();

    expect(requested).toHaveLength(1);
    expect(requested[0]?.id).toBe('wi-1');
  });

  it('should lock and spin the row’s evidence button while its upload is pending', async () => {
    fixture.componentRef.setInput('items', [item({ id: 'wi-1' })]);
    fixture.componentRef.setInput('canAttachEvidence', true);
    fixture.componentRef.setInput('evidencePendingItemIds', new Set(['wi-1']));
    await fixture.whenStable();

    expect(byTestId('intervention-work-item-evidence')).toBeNull();
    expect(byTestId('intervention-work-item-evidence-pending')).not.toBeNull();
  });
});

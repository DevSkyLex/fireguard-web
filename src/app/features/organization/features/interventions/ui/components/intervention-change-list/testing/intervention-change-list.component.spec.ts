import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionChangeOutput } from '@features/organization/features/interventions/models';
import { InterventionChangeList } from '../intervention-change-list.component';

const change = (overrides: Partial<InterventionChangeOutput> = {}): InterventionChangeOutput =>
  ({
    '@id': '/api/intervention-changes/1',
    '@type': 'InterventionChange',
    id: 'change-1',
    intervention: '/api/interventions/intervention-1',
    workItem: null,
    resource: '/api/equipment/equipment-1',
    patch: { locationLabel: 'Rack B-12' },
    status: 'proposed',
    revision: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }) as InterventionChangeOutput;

describe('InterventionChangeList', () => {
  let fixture: ComponentFixture<InterventionChangeList>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (changes: readonly InterventionChangeOutput[]): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionChangeList);
    fixture.componentRef.setInput('changes', changes);
    await fixture.whenStable();
  };

  it('should render only the still-proposed changes', async () => {
    await create([change(), change({ id: 'change-2', status: 'applied' })]);

    expect(root().querySelectorAll('[data-testid="intervention-change-row"]').length).toBe(1);
  });

  it('should name the resource kind from the change IRI', async () => {
    await create([change({ resource: '/api/facilities/facility-1' })]);

    expect(root().textContent).toContain('Facility');
  });

  it('should render the patch as readable field/value lines', async () => {
    await create([change({ patch: { locationLabel: 'Rack B-12' } })]);

    expect(root().textContent).toContain('Location label');
    expect(root().textContent).toContain('Rack B-12');
  });

  it('should show the applied-at-publication caption', async () => {
    await create([change()]);

    expect(root().textContent).toContain(
      'Review proposed values and consult rejected or applied changes.',
    );
  });

  it('should use the compact status select with the proposed state selected by default', async () => {
    await create([change(), change({ id: 'change-2', status: 'applied' })]);

    const filter = root().querySelector<HTMLButtonElement>(
      '[data-testid="intervention-changes-filter"]',
    );
    expect(filter?.textContent).toContain('Status');
    expect(filter?.textContent).toContain('Proposed');
    expect(root().querySelector('hlm-toggle-group')).toBeNull();
  });

  it('should offer no reject control unless the host grants it', async () => {
    await create([change()]);

    expect(root().querySelector('[data-testid="intervention-change-reject"]')).toBeNull();
  });

  it('should emit the rejected change id, and only lock its own row', async () => {
    const rejectedIds: string[] = [];
    await create([change(), change({ id: 'change-2' })]);
    fixture.componentRef.setInput('canReject', true);
    fixture.componentRef.setInput('pendingChangeIds', new Set(['change-2']));
    fixture.componentInstance.rejected.subscribe((id: string) => rejectedIds.push(id));
    await fixture.whenStable();

    const buttons = root().querySelectorAll<HTMLButtonElement>(
      '[data-testid="intervention-change-reject"]',
    );
    expect(buttons.length).toBe(2);
    expect(buttons[0]?.disabled).toBe(false);
    expect(buttons[1]?.disabled).toBe(true);

    buttons[0]?.click();
    expect(rejectedIds).toEqual(['change-1']);
  });
});

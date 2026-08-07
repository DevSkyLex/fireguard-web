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
      'Applied automatically when this intervention is published.',
    );
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionActivityOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionActivityThread } from '../intervention-activity-thread.component';

const MEMBER: MemberSelectOption = {
  value: '/api/organizations/org-1/members/member-1',
  label: 'Jane Doe',
  displayName: 'Jane Doe',
  roleLabel: 'Manager',
  avatarUrl: null,
  initials: 'JD',
};

const activity = (
  overrides: Partial<InterventionActivityOutput> = {},
): InterventionActivityOutput =>
  ({
    '@id': '/api/intervention-activities/1',
    '@type': 'InterventionActivity',
    id: 'activity-1',
    intervention: '/api/interventions/intervention-1',
    kind: 'comment',
    event: 'comment',
    actor: MEMBER.value,
    body: 'Checked the panel, looks fine.',
    payload: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as InterventionActivityOutput;

describe('InterventionActivityThread', () => {
  let fixture: ComponentFixture<InterventionActivityThread>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionActivityThread);
    await fixture.whenStable();
  };

  it('should show a loading skeleton while the first fetch is in flight', async () => {
    await create();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should show an empty message when there is nothing to show', async () => {
    await create();
    await fixture.whenStable();

    expect(root().textContent).toContain('No activity recorded yet.');
  });

  it('should render a comment as a card with the author name and body', async () => {
    await create();
    fixture.componentRef.setInput('activities', [activity()]);
    fixture.componentRef.setInput('members', [MEMBER]);
    await fixture.whenStable();

    expect(root().textContent).toContain('Jane Doe');
    expect(root().textContent).toContain('Checked the panel, looks fine.');
  });

  it('should fall back to a neutral label for an unresolved actor', async () => {
    await create();
    fixture.componentRef.setInput('activities', [
      activity({ actor: '/api/organizations/org-1/members/gone' }),
    ]);
    fixture.componentRef.setInput('members', [MEMBER]);
    await fixture.whenStable();

    expect(root().textContent).toContain('Unknown member');
  });

  it('should render a status change as a thin system line with both status tags', async () => {
    await create();
    fixture.componentRef.setInput('activities', [
      activity({
        kind: 'system',
        event: 'status_changed',
        body: null,
        payload: { from: 'draft', to: 'planned' },
      }),
    ]);
    await fixture.whenStable();

    expect(root().textContent).toContain('changed status');
    expect(root().textContent).toContain('Draft');
    expect(root().textContent).toContain('Planned');
  });

  it('should render a system creation entry without an actor generically', async () => {
    await create();
    fixture.componentRef.setInput('activities', [
      activity({ kind: 'system', event: 'created', actor: null, body: null }),
    ]);
    await fixture.whenStable();

    expect(root().textContent).toContain('Intervention created');
  });
});

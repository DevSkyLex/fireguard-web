import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AuditEventOutput } from '@features/organization/features/audit/models';
import { AuditEventTable } from '../audit-event-table.component';

function event(overrides: Partial<AuditEventOutput> = {}): AuditEventOutput {
  return {
    '@id': '/api/organizations/org-1/audit-events/event-1',
    '@type': 'OrganizationAuditEvent',
    id: 'event-1',
    action: 'facility.created',
    actorType: 'user',
    actorId: 'member-1',
    actorDisplayName: 'Jane Doe',
    subjectType: 'facility',
    subjectId: 'facility-1',
    metadata: { name: 'HQ' },
    occurredAt: '2026-01-18T10:00:00+00:00',
    recordedAt: '2026-01-18T10:00:00+00:00',
    ...overrides,
  };
}

describe('AuditEventTable', () => {
  let fixture: ComponentFixture<AuditEventTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(AuditEventTable);
    fixture.componentRef.setInput('organizationId', 'org-1');
  });

  it('should render one summary row per event with its resolved actor, action and subject', async () => {
    fixture.componentRef.setInput('items', [event()]);
    await fixture.whenStable();

    const row = byTestId('audit-event-table-row');
    expect(row?.textContent).toContain('Jane Doe');
    expect(row?.textContent).toContain('Facility created');
    expect(row?.textContent).toContain('facility');
  });

  it('should render the actor fallback when actorDisplayName is absent', async () => {
    fixture.componentRef.setInput('items', [
      event({ actorType: 'system', actorDisplayName: undefined }),
    ]);
    await fixture.whenStable();

    expect(byTestId('audit-event-table-row')?.textContent).toContain('System');
  });

  it('should render the raw action id humanized for an unregistered action', async () => {
    fixture.componentRef.setInput('items', [event({ action: 'facility.something_new' })]);
    await fixture.whenStable();

    expect(byTestId('audit-event-table-row')?.textContent).toContain('facility something new');
  });

  it('should link a known subject type and render a bare reference for an unknown one', async () => {
    fixture.componentRef.setInput('items', [
      event({ subjectType: 'facility', subjectId: 'facility-1' }),
      event({ id: 'event-2', subjectType: 'webhook_subscription', subjectId: 'sub-1' }),
    ]);
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="audit-event-table-row"]');
    expect(rows[0].querySelector('a')).not.toBeNull();
    expect(rows[1].querySelector('a')).toBeNull();
    expect(rows[1].textContent).toContain('webhook_subscription');
  });

  it('should render a plain dash when the event carries no subject', async () => {
    fixture.componentRef.setInput('items', [
      event({ subjectType: undefined, subjectId: undefined }),
    ]);
    await fixture.whenStable();

    expect(byTestId('audit-event-table-row')?.textContent).toContain('—');
  });

  it('should keep the metadata row collapsed by default and expand it on toggle', async () => {
    fixture.componentRef.setInput('items', [event()]);
    await fixture.whenStable();

    expect(root().textContent).not.toContain('HQ');

    const toggle = byTestId('audit-event-table-expand') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await fixture.whenStable();

    expect(root().textContent).toContain('HQ');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('should render "No additional details." when metadata is empty', async () => {
    fixture.componentRef.setInput('items', [event({ metadata: {} })]);
    await fixture.whenStable();

    (byTestId('audit-event-table-expand') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root().textContent).toContain('No additional details.');
  });

  it('should give each row a distinct, non-identical accessible name for its expand toggle', async () => {
    fixture.componentRef.setInput('items', [
      event({ id: 'event-1', occurredAt: '2026-01-18T10:00:00+00:00' }),
      event({ id: 'event-2', occurredAt: '2026-01-19T08:00:00+00:00' }),
    ]);
    await fixture.whenStable();

    const toggles = root().querySelectorAll('[data-testid="audit-event-table-expand"]');
    const firstLabel = toggles[0].getAttribute('aria-label');
    const secondLabel = toggles[1].getAttribute('aria-label');

    expect(firstLabel).not.toBe(secondLabel);
  });

  it('should render a no-results row when the list is empty and not loading', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();

    expect(root().textContent).toContain('No results.');
  });

  it('should render skeleton rows while loading with no items yet', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(root().querySelectorAll('[data-testid="audit-event-table-row"]').length).toBe(0);
  });
});

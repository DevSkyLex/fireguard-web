import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AuditEventOutput } from '@features/organization/features/audit/models';
import { AuditEventsStore } from '@features/organization/features/audit/state';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { AuditPage } from '../audit-page.component';

const createPage = async (): Promise<ComponentFixture<AuditPage>> => {
  const created: ComponentFixture<AuditPage> = TestBed.createComponent(AuditPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

describe('AuditPage', () => {
  let fixture: ComponentFixture<AuditPage>;
  let load: ReturnType<typeof vi.fn>;

  const event: AuditEventOutput = {
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
  };

  let isForbidden: ReturnType<typeof signal<boolean>>;
  let hasListError: ReturnType<typeof signal<boolean>>;
  let isLoading: ReturnType<typeof signal<boolean>>;
  let events: ReturnType<typeof signal<readonly AuditEventOutput[]>>;
  let totalEvents: ReturnType<typeof signal<number>>;

  beforeEach(() => {
    load = vi.fn();
    isForbidden = signal(false);
    hasListError = signal(false);
    isLoading = signal(false);
    events = signal<readonly AuditEventOutput[]>([event]);
    totalEvents = signal(1);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        provideRouter([]),
        {
          provide: AuditEventsStore,
          useValue: {
            load,
            events,
            totalEvents,
            isLoading,
            isEmpty: signal(false),
            hasListError,
            isForbidden,
          },
        },
      ],
    });
  });

  it('should load the first page with no filters on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { page: 1, itemsPerPage: 30 },
      query: { action: undefined, from: undefined, to: undefined },
    });
  });

  it('should narrow the list to the picked action and reset to page 1', async () => {
    fixture = await createPage();
    load.mockClear();

    (
      fixture.componentInstance as unknown as { applyAction(value: string | null): void }
    ).applyAction('facility.created');
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { action: 'facility.created', from: undefined, to: undefined },
      }),
    );
  });

  it('should convert a picked date range to inclusive ISO bounds', async () => {
    fixture = await createPage();
    load.mockClear();

    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T00:00:00Z');
    (
      fixture.componentInstance as unknown as {
        applyDateRange(range: [Date, Date] | null): void;
      }
    ).applyDateRange([from, to]);
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { action: undefined, from: from.toISOString(), to: to.toISOString() },
      }),
    );
  });

  it('should render the generic error state on a non-403 failure', async () => {
    hasListError.set(true);
    fixture = await createPage();

    expect(fixture.nativeElement.textContent).toContain("Couldn't load the audit journal");
    expect(fixture.nativeElement.querySelector('[data-testid="audit-retry"]')).not.toBeNull();
  });

  it('should render the distinct forbidden copy on a 403, not the generic error state', async () => {
    hasListError.set(true);
    isForbidden.set(true);
    fixture = await createPage();

    expect(fixture.nativeElement.textContent).toContain('You need the audit permission');
    expect(fixture.nativeElement.querySelector('[data-testid="audit-retry"]')).toBeNull();
  });

  it('should render the empty state when nothing matches and no error occurred', async () => {
    events.set([]);
    totalEvents.set(0);
    fixture = await createPage();

    expect(fixture.nativeElement.textContent).toContain('No audit events');
  });

  it('should retry the current query on reload', async () => {
    fixture = await createPage();
    load.mockClear();

    (fixture.componentInstance as unknown as { reload(): void }).reload();

    expect(load).toHaveBeenCalledTimes(1);
  });
});

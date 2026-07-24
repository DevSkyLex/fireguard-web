import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';
import { AuditStore } from '@features/organization/state/organization-audit';
import { OrganizationAuditLogPage } from '../organization-audit-log.component';

type AuditLogPageTestApi = OrganizationAuditLogPage & {
  onLoad(options: AuditEventListOptions): void;
  onViewDetails(auditEvent: AuditEventOutput): void;
  onPageChange(page: number): void;
  onDrawerVisibleChange(visible: boolean): void;
  retry(): void;
  selectedEvent: WritableSignal<AuditEventOutput | null>;
};

const MOCK_EVENT: AuditEventOutput = {
  id: 'audit-1',
  action: 'organization.updated',
  actorType: 'user',
  actorId: 'user-1',
  actorEmail: 'alice@example.com',
  occurredAt: '2026-07-01T12:00:00Z',
  recordedAt: '2026-07-01T12:00:01Z',
  chainId: 'chain-1',
  sequence: 1,
  eventHash: 'hash-1',
} as unknown as AuditEventOutput;

describe('OrganizationAuditLogPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  let component: AuditLogPageTestApi;
  let store: {
    auditEvents: WritableSignal<readonly AuditEventOutput[]>;
    totalAuditEvents: WritableSignal<number>;
    isLoading: WritableSignal<boolean>;
    isEmpty: WritableSignal<boolean>;
    listError: WritableSignal<{ message?: string } | null>;
    load: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    store = {
      auditEvents: signal<readonly AuditEventOutput[]>([]),
      totalAuditEvents: signal<number>(0),
      isLoading: signal<boolean>(false),
      isEmpty: signal<boolean>(true),
      listError: signal<{ message?: string } | null>(null),
      load: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [OrganizationAuditLogPage],
      providers: [provideRouter([])],
    }).overrideComponent(OrganizationAuditLogPage, {
      set: { providers: [{ provide: AuditStore, useValue: store }] },
    });

    component = TestBed.createComponent(OrganizationAuditLogPage)
      .componentInstance as unknown as AuditLogPageTestApi;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the page heading', () => {
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Audit log');
  });

  it('should forward the table load event to the store', () => {
    component.onLoad({ page: 2, itemsPerPage: 20, action: 'organization.updated' });
    expect(store.load).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 20,
      action: 'organization.updated',
    });
  });

  it('should replay the last load request on retry', () => {
    component.onLoad({ page: 3, itemsPerPage: 20 });
    store.load.mockClear();
    component.retry();
    expect(store.load).toHaveBeenCalledWith({ page: 3, itemsPerPage: 20 });
  });

  it('should replay an undefined request on retry when no load happened yet', () => {
    component.retry();
    expect(store.load).toHaveBeenCalledWith(undefined);
  });

  it('should show the empty state when there are no audit events', () => {
    store.isEmpty.set(true);
    store.auditEvents.set([]);
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No audit events');
  });

  it('should render the populated table with an audit event row', () => {
    store.isEmpty.set(false);
    store.auditEvents.set([MOCK_EVENT]);
    store.totalAuditEvents.set(1);
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('organization.updated');
    expect(fixture.nativeElement.textContent).toContain('alice@example.com');
  });

  it('should render the loading skeleton state', () => {
    store.isLoading.set(true);
    store.isEmpty.set(false);
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).not.toBeNull();
  });

  it('should render the error banner with a retry button and forward the click', () => {
    store.listError.set({ message: 'Boom' });
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Boom');

    const retryButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('p-message button');
    expect(retryButton).not.toBeNull();
    retryButton?.click();
    fixture.detectChanges();

    expect(store.load).toHaveBeenCalled();
  });

  it('should fall back to the localized message when the error carries no message', () => {
    store.listError.set({});
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The audit log could not be loaded.');
  });

  it('should open the detail drawer for the selected audit event', () => {
    component.onViewDetails(MOCK_EVENT);
    expect(component.selectedEvent()).toEqual(MOCK_EVENT);
  });

  it('should render the detail drawer visible with the selected event', () => {
    const fixture = TestBed.createComponent(OrganizationAuditLogPage);
    const instance = fixture.componentInstance as unknown as AuditLogPageTestApi;
    fixture.detectChanges();

    instance.onViewDetails(MOCK_EVENT);
    fixture.detectChanges();

    // p-drawer renders its content via `appendTo: 'body'`, outside the fixture root.
    expect(document.body.textContent).toContain('organization.updated');
  });

  it('should clear the selected event when the drawer reports its own dismissal', () => {
    component.onViewDetails(MOCK_EVENT);
    expect(component.selectedEvent()).not.toBeNull();

    component.onDrawerVisibleChange(false);
    expect(component.selectedEvent()).toBeNull();
  });

  it('should not clear the selected event when the drawer reports it opened', () => {
    component.onViewDetails(MOCK_EVENT);
    component.onDrawerVisibleChange(true);
    expect(component.selectedEvent()).toEqual(MOCK_EVENT);
  });

  it('should update the ?page= query param when the table changes page', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onPageChange(3);

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { page: 3 },
      queryParamsHandling: 'merge',
    });
  });

  it('should omit the page query param when navigating back to page 1', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onPageChange(1);

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { page: null },
      queryParamsHandling: 'merge',
    });
  });
});

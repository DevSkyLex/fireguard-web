import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  input as inputSignal,
  output,
  signal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import {
  CustomerStore,
  customerStoreEvents,
} from '@features/organization/features/customers/state';
import { CustomerEditorSheet } from '@features/organization/features/customers/ui/sheets/customer-editor-sheet/customer-editor-sheet.component';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { CollectionPagination } from '@shared/collection-pagination';
import { CustomersPage } from '../customers-page.component';

describe('CustomersPage', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  it('loads active customer pages and switches to the archived server universe', async () => {
    const service = { list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        { provide: CustomerService, useValue: service },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        { provide: OrganizationPermissionService, useValue: { hasPermission: () => true } },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
      ],
    });
    const fixture = TestBed.createComponent(CustomersPage);
    fixture.componentRef.setInput('organizationId', 'org');
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ params: { archived: false } }),
    );
    const page = fixture.componentInstance as unknown as {
      archiveFilter: (value: unknown) => void;
    };
    page.archiveFilter('archived');
    await fixture.whenStable();
    expect(service.list).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ params: { archived: true } }),
    );
    expect(fixture.nativeElement.textContent).toContain('No customers in this view');
  });
  it.each([
    { platform: 'server', permissions: true },
    { platform: 'browser', permissions: false },
  ])(
    'does not read customer data on $platform with permissions=$permissions',
    async ({ platform, permissions }) => {
      const service = { list: vi.fn() };
      TestBed.configureTestingModule({
        imports: [CustomersPage],
        providers: [
          { provide: PLATFORM_ID, useValue: platform },
          { provide: CustomerService, useValue: service },
          { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
          {
            provide: OrganizationPermissionService,
            useValue: { hasPermission: () => permissions },
          },
          { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
        ],
      });
      const fixture = TestBed.createComponent(CustomersPage);
      fixture.componentRef.setInput('organizationId', 'org');
      await fixture.whenStable();
      expect(service.list).not.toHaveBeenCalled();
      if (!permissions) expect(fixture.nativeElement.textContent).not.toContain('New customer');
    },
  );
});

@Component({
  selector: 'app-customer-editor-sheet',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CustomerEditorSheetStub {
  readonly visible = inputSignal(false);
  readonly customer = inputSignal<CustomerOutput | null>(null);
  readonly pending = inputSignal(false);
  readonly error = inputSignal<string | null>(null);
  readonly conflict = inputSignal(false);
  readonly refreshRequested = output<void>();
  readonly dismissed = output<void>();
  readonly submitted = output<CustomerInput>();
}

describe('CustomersPage', () => {
  const organizationId = '00000000-0000-4000-8000-000000000001';
  const otherOrganizationId = '00000000-0000-4000-8000-000000000002';
  const customer: CustomerOutput = {
    '@id': '/api/organizations/' + organizationId + '/customers/customer-1',
    '@type': 'Customer',
    id: 'customer-1',
    organizationId,
    name: 'Hospital',
    contacts: [{ name: 'Safety manager', role: 'Safety', email: null, phone: null }],
    revision: 3,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  let fixture: ComponentFixture<CustomersPage>;
  let store: {
    load: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    clearWrite: ReturnType<typeof vi.fn>;
    customerEntities: ReturnType<typeof signal<CustomerOutput[]>>;
    listCallState: ReturnType<typeof signal<CallState>>;
    readCallState: ReturnType<typeof signal<CallState<CustomerOutput>>>;
    writeCallState: ReturnType<typeof signal<CallState<CustomerOutput>>>;
    pageCount: ReturnType<typeof signal<number>>;
    total: ReturnType<typeof signal<number>>;
  };
  const online = signal(true);
  const grants = signal<string[]>([]);

  beforeEach(() => {
    online.set(true);
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ, ORGANIZATION_PERMISSION.CUSTOMERS_MANAGE]);
    store = {
      load: vi.fn(),
      read: vi.fn(),
      save: vi.fn(),
      clearWrite: vi.fn(),
      customerEntities: signal<CustomerOutput[]>([customer]),
      listCallState: signal<CallState>(successCallState(null)),
      readCallState: signal<CallState<CustomerOutput>>(idleCallState()),
      writeCallState: signal<CallState<CustomerOutput>>(idleCallState()),
      pageCount: signal(3),
      total: signal(41),
    };
    TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        provideRouter([]),
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        { provide: ConnectivityService, useValue: { isOnline: online } },
      ],
    }).overrideComponent(CustomersPage, {
      remove: { imports: [CustomerEditorSheet], providers: [CustomerStore] },
      add: {
        imports: [CustomerEditorSheetStub],
        providers: [{ provide: CustomerStore, useValue: store }],
      },
    });
  });

  const render = async (): Promise<void> => {
    fixture = TestBed.createComponent(CustomersPage);
    fixture.componentRef.setInput('organizationId', organizationId);
    await fixture.whenStable();
  };
  const button = (text: string): HTMLButtonElement => {
    const found = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.trim() === text);
    if (!found) throw new Error('Missing action: ' + text);
    return found;
  };
  const editor = (): CustomerEditorSheetStub =>
    fixture.debugElement.query(By.directive(CustomerEditorSheetStub))
      .componentInstance as CustomerEditorSheetStub;
  const changeSearch = async (value: string): Promise<void> => {
    const search = fixture.nativeElement.querySelector(
      '[data-testid="customers-search"]',
    ) as HTMLInputElement;
    search.value = value;
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('restarts server search and archived filtering from page one', async () => {
    await render();
    expect(store.load.mock.calls).toEqual([
      [null],
      [{ organizationId, page: 1, search: '', archived: false }],
    ]);
    const pagination = fixture.debugElement.query(By.directive(CollectionPagination))
      .componentInstance as CollectionPagination;
    pagination.pageChanged.emit(3);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 3,
      search: '',
      archived: false,
    });
    await changeSearch('Hospital');
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: 'Hospital',
      archived: false,
    });
    fixture.debugElement
      .query(By.css('hlm-toggle-group'))
      .triggerEventHandler('valueChange', 'archived');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: 'Hospital',
      archived: true,
    });
    const calls = store.load.mock.calls.length;
    fixture.debugElement
      .query(By.css('hlm-toggle-group'))
      .triggerEventHandler('valueChange', undefined);
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledTimes(calls);
    fixture.debugElement
      .query(By.css('hlm-toggle-group'))
      .triggerEventHandler('valueChange', 'active');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: 'Hospital',
      archived: false,
    });
  });

  it('opens creation with cleared feedback and forwards the exact normalized input', async () => {
    await render();
    button('New customer').click();
    await fixture.whenStable();
    expect(store.clearWrite).toHaveBeenCalledOnce();
    expect(store.read).toHaveBeenCalledExactlyOnceWith(null);
    expect(editor().customer()).toBeNull();
    expect(editor().visible()).toBe(true);
    const input: CustomerInput = { name: 'North Hospital', email: null, contacts: [] };
    editor().submitted.emit(input);
    await fixture.whenStable();
    expect(store.save).toHaveBeenCalledExactlyOnceWith({ kind: 'create', organizationId, input });
    expect(fixture.debugElement.query(By.directive(CustomerEditorSheetStub))).not.toBeNull();
  });

  it('updates the displayed revision and dismisses only after a matching organization saved event', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    const input: CustomerInput = { name: 'Updated Hospital', contacts: [] };
    expect(editor().customer()).toEqual(customer);
    editor().submitted.emit(input);
    expect(store.save).toHaveBeenCalledExactlyOnceWith({
      kind: 'update',
      organizationId,
      customer,
      input,
    });
    TestBed.inject(Dispatcher).dispatch(
      customerStoreEvents.saved({ organizationId: otherOrganizationId, customerId: customer.id }),
    );
    await fixture.whenStable();
    expect(editor().customer()).toEqual(customer);
    const loads = store.load.mock.calls.length;
    TestBed.inject(Dispatcher).dispatch(
      customerStoreEvents.saved({ organizationId, customerId: customer.id }),
    );
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(CustomerEditorSheetStub))).toBeNull();
    expect(store.load).toHaveBeenCalledTimes(loads + 1);
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: '',
      archived: false,
    });
  });

  it('forwards revision-checked archive and restore commands for the corresponding row', async () => {
    await render();
    button('Archive').click();
    expect(store.save).toHaveBeenLastCalledWith({ kind: 'archive', organizationId, customer });
    const archived = { ...customer, archivedAt: '2026-10-06T11:00:00Z' };
    store.customerEntities.set([archived]);
    await fixture.whenStable();
    button('Restore').click();
    expect(store.save).toHaveBeenLastCalledWith({
      kind: 'restore',
      organizationId,
      customer: archived,
    });
  });

  it('keeps a conflicting editor open, refreshes its revision and retries with the form payload', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    store.writeCallState.set(
      errorCallState(
        toStoreError({ type: 'about:blank', status: 412, detail: 'Revision conflict' }),
      ),
    );
    await fixture.whenStable();
    expect(editor().error()).toBe('Revision conflict');
    expect(editor().conflict()).toBe(true);
    editor().refreshRequested.emit();
    expect(store.read).toHaveBeenLastCalledWith({ organizationId, customerId: customer.id });
    const refreshed = { ...customer, revision: 4, name: 'Concurrent name' };
    store.readCallState.set(successCallState(refreshed));
    await fixture.whenStable();
    expect(editor().customer()).toEqual(refreshed);
    expect(store.clearWrite).toHaveBeenCalledTimes(2);
    const input: CustomerInput = { name: 'My draft' };
    editor().submitted.emit(input);
    expect(store.save).toHaveBeenLastCalledWith({
      kind: 'update',
      organizationId,
      customer: refreshed,
      input,
    });
  });

  it('ignores refreshed records from another scope or identity and prioritizes read feedback', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    store.readCallState.set(successCallState({ ...customer, organizationId: otherOrganizationId }));
    await fixture.whenStable();
    expect(editor().customer()).toEqual(customer);
    store.readCallState.set(successCallState({ ...customer, id: 'customer-2' }));
    await fixture.whenStable();
    expect(editor().customer()).toEqual(customer);
    store.writeCallState.set(errorCallState(toStoreError(new Error('Save failed'))));
    store.readCallState.set(errorCallState(toStoreError(new Error('Refresh failed'))));
    await fixture.whenStable();
    expect(editor().error()).toBe('Refresh failed');
  });

  it('resets editor and directory context when the route organization changes', async () => {
    await render();
    await changeSearch('Hospital');
    button('Edit').click();
    await fixture.whenStable();
    fixture.componentRef.setInput('organizationId', otherOrganizationId);
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(CustomerEditorSheetStub))).toBeNull();
    expect(
      (fixture.nativeElement.querySelector('[data-testid="customers-search"]') as HTMLInputElement)
        .value,
    ).toBe('');
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId: otherOrganizationId,
      page: 1,
      search: '',
      archived: false,
    });
  });

  it('locks row and creation actions during writes and forwards pending state to the editor', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    store.writeCallState.set(pendingCallState());
    await fixture.whenStable();
    expect(editor().pending()).toBe(true);
    expect(button('New customer').disabled).toBe(true);
    expect(button('Edit').disabled).toBe(true);
    expect(button('Archive').disabled).toBe(true);
  });

  it('preserves an open editor offline and rejects submission and refresh until reconnection', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    online.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Your draft is preserved.');
    expect(button('New customer').disabled).toBe(true);
    editor().submitted.emit({ name: 'My draft' });
    editor().refreshRequested.emit();
    expect(store.save).not.toHaveBeenCalled();
    expect(store.read).toHaveBeenCalledExactlyOnceWith(null);
    expect(editor().customer()).toEqual(customer);
    online.set(true);
    await fixture.whenStable();
    editor().submitted.emit({ name: 'My draft' });
    expect(store.save).toHaveBeenCalledExactlyOnceWith({
      kind: 'update',
      organizationId,
      customer,
      input: { name: 'My draft' },
    });
  });

  it('keeps directory read permission independent from mutation permission', async () => {
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    await render();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: '',
      archived: false,
    });
    expect(fixture.nativeElement.querySelector('[data-testid="customers-new"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-customer-id] td:last-child')?.textContent.trim(),
    ).toBe('');
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_MANAGE]);
    store.load.mockClear();
    await fixture.whenStable();
    await changeSearch('Other');
    expect(store.load).not.toHaveBeenCalled();
    button('New customer').click();
    await fixture.whenStable();
    editor().submitted.emit({ name: 'Hospital' });
    expect(store.save).toHaveBeenCalledExactlyOnceWith({
      kind: 'create',
      organizationId,
      input: { name: 'Hospital' },
    });
  });

  it('rechecks management permission before submitting an editor left open after grants change', async () => {
    await render();
    button('Edit').click();
    await fixture.whenStable();
    grants.set([ORGANIZATION_PERMISSION.CUSTOMERS_READ]);
    await fixture.whenStable();
    editor().submitted.emit({ name: 'My draft' });
    expect(store.save).not.toHaveBeenCalled();
    expect(editor().customer()).toEqual(customer);
    editor().dismissed.emit();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(CustomerEditorSheetStub))).toBeNull();
  });

  it('renders failed reads and mutations and retries the current directory query', async () => {
    await render();
    await changeSearch('Hospital');
    store.listCallState.set(errorCallState(toStoreError(new Error('Directory unavailable'))));
    store.writeCallState.set(errorCallState(toStoreError(new Error('Archive refused'))));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Directory unavailable');
    expect(fixture.nativeElement.textContent).toContain('Archive refused');
    button('Retry').click();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId,
      page: 1,
      search: 'Hospital',
      archived: false,
    });
    store.customerEntities.set([]);
    store.listCallState.set(pendingCallState());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('No customers in this view');
    store.listCallState.set(successCallState(null));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No customers in this view');
  });
});

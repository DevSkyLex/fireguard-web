import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { CustomerService } from '@features/organization/features/customers/data-access';
import type { CustomerOutput } from '@features/organization/features/customers/models';
import { CustomerStore, type CustomerStoreType } from '../customer.store';
import { customerStoreEvents } from '../events/events';

describe('CustomerStore', () => {
  const customer: CustomerOutput = {
    '@id': 'customer',
    '@type': 'Customer',
    id: 'customer',
    organizationId: 'org',
    name: 'Hospital',
    contacts: [],
    revision: 1,
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  };
  const directory: HydraCollection<CustomerOutput> = {
    '@id': 'customers',
    '@type': 'Collection',
    member: [customer],
    totalItems: 35,
  };
  let store: CustomerStoreType;
  let service: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    archive: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    service = {
      list: vi.fn().mockReturnValue(of(directory)),
      get: vi.fn().mockReturnValue(of(customer)),
      create: vi.fn().mockReturnValue(of(customer)),
      update: vi.fn().mockReturnValue(of(customer)),
      archive: vi.fn().mockReturnValue(of(customer)),
      restore: vi.fn().mockReturnValue(of(customer)),
    };
    TestBed.configureTestingModule({
      providers: [CustomerStore, { provide: CustomerService, useValue: service }],
    });
    store = TestBed.inject(CustomerStore);
  });
  afterEach(() => vi.restoreAllMocks());
  it('cancels obsolete search pages and computes the server page count', () => {
    const old = new Subject<HydraCollection<CustomerOutput>>();
    service.list.mockReturnValueOnce(old);
    store.load({ organizationId: 'org', search: 'old' });
    store.load({ organizationId: 'org', search: 'hospital', page: 2 });
    expect(old.observed).toBe(false);
    expect(store.customerEntities()).toEqual([customer]);
    expect(store.pageCount()).toBe(2);
  });
  it('retains same-organization records on failure but clears them when switching organization', () => {
    store.load({ organizationId: 'org' });
    service.list.mockReturnValue(
      throwError(() => ({ status: 503, title: 'Unavailable', detail: 'Try again' })),
    );
    store.load({ organizationId: 'org', page: 2 });
    expect(store.customerEntities()).toEqual([customer]);
    expect(store.listCallState().status).toBe('error');
    store.load({ organizationId: 'other' });
    expect(store.customerEntities()).toEqual([]);
    expect(store.total()).toBe(0);
  });
  it('does not cancel an accepted write on a repeated click', () => {
    const accepted = new Subject<CustomerOutput>();
    service.create.mockReturnValue(accepted);
    store.load({ organizationId: 'org' });
    store.save({ kind: 'create', organizationId: 'org', input: { name: 'Hospital' } });
    store.save({ kind: 'create', organizationId: 'org', input: { name: 'Second' } });
    expect(accepted.observed).toBe(true);
    expect(service.create).toHaveBeenCalledTimes(1);
    accepted.next(customer);
    accepted.complete();
    expect(store.writeCallState().status).toBe('success');
  });
  it('does not attribute a previous organization write failure to the new scope', () => {
    const accepted = new Subject<CustomerOutput>();
    service.create.mockReturnValue(accepted);
    store.load({ organizationId: 'org' });
    store.save({ kind: 'create', organizationId: 'org', input: { name: 'Hospital' } });
    store.load({ organizationId: 'other' });
    expect(store.writeCallState().status).toBe('pending');
    accepted.error({ status: 412, title: 'Conflict' });
    expect(store.writeCallState().status).toBe('idle');
  });
  it('hydrates archived selected customers independently and cancels stale selections', () => {
    const old = new Subject<CustomerOutput>();
    service.get
      .mockReturnValueOnce(old)
      .mockReturnValueOnce(of({ ...customer, archivedAt: '2026-10-06T11:00:00Z' }));
    store.read({ organizationId: 'org', customerId: 'old' });
    store.read({ organizationId: 'org', customerId: 'customer' });
    expect(old.observed).toBe(false);
    expect(store.readCallState().data?.archivedAt).toBe('2026-10-06T11:00:00Z');
    store.read(null);
    expect(store.readCallState().data).toBeNull();
  });

  it.each(['update', 'archive', 'restore'] as const)(
    'accepts one %s command and publishes immutable identity after success',
    (kind) => {
      const accepted = new Subject<CustomerOutput>();
      service[kind].mockReturnValue(accepted);
      const dispatcher = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
      store.load({ organizationId: 'org' });
      store.save(
        kind === 'update'
          ? { kind, organizationId: 'org', customer, input: { name: 'Updated Hospital' } }
          : { kind, organizationId: 'org', customer },
      );
      expect(store.writeCallState().status).toBe('pending');
      if (kind === 'update')
        expect(service.update).toHaveBeenCalledExactlyOnceWith('org', customer, {
          name: 'Updated Hospital',
        });
      else expect(service[kind]).toHaveBeenCalledExactlyOnceWith('org', customer);
      store.clearWrite();
      expect(store.writeCallState().status).toBe('pending');
      expect(dispatcher).not.toHaveBeenCalled();
      const updated = { ...customer, revision: 2 };
      accepted.next(updated);
      accepted.complete();
      expect(store.writeCallState().status).toBe('success');
      expect(store.writeCallState().data).toEqual(updated);
      expect(dispatcher).toHaveBeenCalledExactlyOnceWith(
        customerStoreEvents.saved({ organizationId: 'org', customerId: customer.id }),
      );
      store.clearWrite();
      expect(store.writeCallState().status).toBe('idle');
      expect(store.writeCallState().data).toBeNull();
    },
  );

  it('normalizes a rejected write and permits retry without emitting a saved event for rejection', () => {
    store.load({ organizationId: 'org' });
    const dispatcher = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    service.update.mockReturnValueOnce(
      throwError(() => ({
        status: 412,
        title: 'Revision conflict',
        detail: 'Refresh the revision.',
        type: 'about:blank',
      })),
    );
    store.save({ kind: 'update', organizationId: 'org', customer, input: { name: 'My draft' } });
    expect(store.writeCallState().status).toBe('error');
    expect(store.writeCallState().error).toMatchObject({
      code: 412,
      message: 'Refresh the revision.',
    });
    expect(dispatcher).not.toHaveBeenCalled();
    const refreshed = { ...customer, revision: 2 };
    store.save({
      kind: 'update',
      organizationId: 'org',
      customer: refreshed,
      input: { name: 'My draft' },
    });
    expect(service.update).toHaveBeenLastCalledWith('org', refreshed, { name: 'My draft' });
    expect(store.writeCallState().status).toBe('success');
  });

  it('publishes the originating organization after an accepted write succeeds in another scope', () => {
    const accepted = new Subject<CustomerOutput>();
    service.create.mockReturnValue(accepted);
    const dispatcher = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    store.load({ organizationId: 'org' });
    store.save({ kind: 'create', organizationId: 'org', input: { name: 'Hospital' } });
    store.load(null);
    expect(store.writeCallState().status).toBe('pending');
    expect(accepted.observed).toBe(true);
    store.load({ organizationId: 'other' });
    accepted.next(customer);
    accepted.complete();
    expect(store.writeCallState().status).toBe('idle');
    expect(store.writeCallState().data).toBeNull();
    expect(dispatcher).toHaveBeenCalledExactlyOnceWith(
      customerStoreEvents.saved({ organizationId: 'org', customerId: customer.id }),
    );
  });

  it('normalizes retained-record failure and resets scoped collection state on dismissal', () => {
    service.get.mockReturnValue(
      throwError(() => ({
        status: 404,
        title: 'Customer not found',
        detail: 'This customer is unavailable.',
        type: 'about:blank',
      })),
    );
    store.read({ organizationId: 'org', customerId: 'missing' });
    expect(store.readCallState().status).toBe('error');
    expect(store.readCallState().error).toMatchObject({
      code: 404,
      message: 'This customer is unavailable.',
    });
    store.load({ organizationId: 'org' });
    store.load(null);
    expect(store.query()).toBeNull();
    expect(store.customerEntities()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.pageCount()).toBe(1);
    expect(store.listCallState().status).toBe('idle');
    expect(store.readCallState().status).toBe('idle');
  });
});

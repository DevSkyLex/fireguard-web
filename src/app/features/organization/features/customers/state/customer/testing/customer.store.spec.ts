import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { CustomerService } from '@features/organization/features/customers/data-access';
import type { CustomerOutput } from '@features/organization/features/customers/models';
import { CustomerStore, type CustomerStoreType } from '../customer.store';

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
    expect(store.readCallState().data?.archivedAt).toBeTruthy();
    store.read(null);
    expect(store.readCallState().data).toBeNull();
  });
});

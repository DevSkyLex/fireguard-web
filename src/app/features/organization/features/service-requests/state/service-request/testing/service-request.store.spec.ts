import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type { ServiceRequestOutput } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { ServiceRequestStore, type ServiceRequestStoreType } from '../service-request.store';
describe('ServiceRequestStore', () => {
  const request = serviceRequestFixture();
  const collection: HydraCollection<ServiceRequestOutput> = {
    '@id': 'requests',
    '@type': 'Collection',
    member: [request],
    totalItems: 61,
  };
  let service: Record<
    'list' | 'get' | 'create' | 'update' | 'qualify' | 'reject' | 'cancel' | 'convert',
    ReturnType<typeof vi.fn>
  >;
  let store: ServiceRequestStoreType;
  beforeEach(() => {
    service = {
      list: vi.fn().mockReturnValue(of(collection)),
      get: vi.fn().mockReturnValue(of(request)),
      create: vi.fn().mockReturnValue(of(request)),
      update: vi.fn().mockReturnValue(of(request)),
      qualify: vi.fn().mockReturnValue(of(request)),
      reject: vi.fn().mockReturnValue(of(request)),
      cancel: vi.fn().mockReturnValue(of(request)),
      convert: vi.fn().mockReturnValue(of(request)),
    };
    TestBed.configureTestingModule({
      providers: [ServiceRequestStore, { provide: ServiceRequestService, useValue: service }],
    });
    store = TestBed.inject(ServiceRequestStore);
  });
  it('cancels an old target search and uses server totals for every page', () => {
    const old = new Subject<HydraCollection<ServiceRequestOutput>>();
    service.list.mockReturnValueOnce(old);
    store.load({ organizationId: 'org', equipmentId: 'old', search: 'broken' });
    store.load({ organizationId: 'org', siteId: 'site', status: 'qualified', page: 2 });
    expect(old.observed).toBe(false);
    expect(store.requestEntities()).toEqual([request]);
    expect(store.pageCount()).toBe(3);
    expect(service.list).toHaveBeenLastCalledWith(
      'org',
      expect.objectContaining({ page: 2, params: { siteId: 'site', status: 'qualified' } }),
    );
  });
  it('keeps accepted writes in flight and ignores a repeated submission', () => {
    const accepted = new Subject<ServiceRequestOutput>();
    service.qualify.mockReturnValue(accepted);
    store.read({ organizationId: 'org', requestId: 'request' });
    store.write({ kind: 'qualify', organizationId: 'org', request, input: { note: 'Inspect' } });
    store.write({ kind: 'qualify', organizationId: 'org', request, input: { note: 'Again' } });
    expect(service.qualify).toHaveBeenCalledTimes(1);
    expect(accepted.observed).toBe(true);
    accepted.next(serviceRequestFixture({ status: 'qualified', revision: 2 }));
    accepted.complete();
    expect(store.readCallState().data?.status).toBe('qualified');
    expect(store.writeCallState().status).toBe('success');
  });
  it('retains the exact conversion after network loss even if a caller provides another operation or work', () => {
    const original = {
      clientOperationId: 'original',
      existingInterventionId: 'work',
      existingTaskId: 'task',
    };
    const qualified = serviceRequestFixture({ status: 'qualified', revision: 3 });
    service.convert
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(
        of(
          serviceRequestFixture({
            status: 'converted',
            revision: 4,
            interventionId: 'work',
            taskId: 'task',
          }),
        ),
      );
    store.read({ organizationId: 'org', requestId: 'request' });
    store.write({ kind: 'convert', organizationId: 'org', request: qualified, input: original });
    expect(store.conversionUncertain()).toBe(true);
    store.clearWrite();
    expect(store.conversionCommand()?.input).toEqual(original);
    store.write({
      kind: 'convert',
      organizationId: 'org',
      request: serviceRequestFixture({ revision: 99 }),
      input: { clientOperationId: 'replacement' },
    });
    expect(service.convert).toHaveBeenLastCalledWith('org', qualified, original);
    expect(store.conversionCommand()).toBeNull();
    expect(store.readCallState().data?.interventionId).toBe('work');
  });
  it('keeps a stale revision error until explicit review instead of automatically rebasing an action', () => {
    service.update.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 412,
            error: { detail: 'Review current version' },
          }),
      ),
    );
    store.read({ organizationId: 'org', requestId: 'request' });
    store.write({ kind: 'update', organizationId: 'org', request, input: { title: 'Draft' } });
    expect(store.writeCallState().error?.code).toBe(412);
    expect(store.readCallState().data?.revision).toBe(1);
    expect(service.get).toHaveBeenCalledTimes(1);
    store.clearWrite();
    expect(store.writeCallState().status).toBe('idle');
  });
  it('does not cancel a previous organization write or show its failure in the new scope', () => {
    const accepted = new Subject<ServiceRequestOutput>();
    service.create.mockReturnValue(accepted);
    store.load({ organizationId: 'org' });
    store.write({
      kind: 'create',
      organizationId: 'org',
      input: { title: 'Repair', description: 'Damaged gauge', equipmentId: 'equipment' },
    });
    store.load({ organizationId: 'other' });
    expect(accepted.observed).toBe(true);
    accepted.error({ status: 409, title: 'Conflict', detail: 'Old organization' });
    expect(store.writeCallState().status).toBe('idle');
    expect(store.organizationId()).toBe('other');
  });
  it('cancels obsolete detail reads and clears the retained target when leaving', () => {
    const old = new Subject<ServiceRequestOutput>();
    service.get.mockReturnValueOnce(old);
    store.read({ organizationId: 'org', requestId: 'old' });
    store.read({ organizationId: 'org', requestId: 'request' });
    expect(old.observed).toBe(false);
    expect(store.readCallState().data?.id).toBe('request');
    store.read(null);
    expect(store.readCallState().data).toBeNull();
  });
  it('keeps old request action feedback out of another request in the same organization', () => {
    const accepted = new Subject<ServiceRequestOutput>();
    service.cancel.mockReturnValue(accepted);
    store.read({ organizationId: 'org', requestId: 'request' });
    store.write({
      kind: 'cancel',
      organizationId: 'org',
      request,
      input: { reason: 'Resolved elsewhere' },
    });
    service.get.mockReturnValue(of(serviceRequestFixture({ id: 'other' })));
    store.read({ organizationId: 'org', requestId: 'other' });
    accepted.next(serviceRequestFixture({ status: 'cancelled' }));
    accepted.complete();
    expect(store.readCallState().data?.id).toBe('other');
    expect(store.writeCallState().status).toBe('idle');
  });
});

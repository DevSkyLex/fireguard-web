import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type {
  ServiceRequestConversionCommand,
  ServiceRequestOutput,
} from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { serviceRequestContext } from '@features/organization/features/service-requests/state/service-request/testing/service-request-context.fixture';
import { ServiceRequestConversionService } from '../service-request-conversion.service';

describe('ServiceRequestConversionService', () => {
  const command: ServiceRequestConversionCommand = {
    kind: 'convert',
    userId: 'user',
    organizationId: 'org',
    request: serviceRequestFixture({ revision: 3, status: 'qualified' }),
    input: {
      clientOperationId: 'operation',
      existingInterventionId: 'work',
      existingTaskId: 'task',
    },
  };
  function setup() {
    const context = serviceRequestContext();
    const api = {
      convert: vi
        .fn()
        .mockReturnValue(of(serviceRequestFixture({ ...command.request, status: 'converted' }))),
    };
    TestBed.configureTestingModule({
      providers: [...context.providers, { provide: ServiceRequestService, useValue: api }],
    });
    return { context, api, service: TestBed.inject(ServiceRequestConversionService) };
  }

  it('waits for durable commit and rejects an old session before any network transmission', async () => {
    const { context, api, service } = setup();
    let commit: () => void = vi.fn();
    context.journal.retain.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          commit = resolve;
        }),
    );
    const result = service.execute(command, 1).subscribe();
    await vi.waitFor(() => expect(context.journal.retain).toHaveBeenCalledWith(command, 1));
    expect(api.convert).not.toHaveBeenCalled();
    context.revision.set(2);
    commit();
    await vi.waitFor(() => expect(result.closed).toBe(true));
    expect(api.convert).not.toHaveBeenCalled();
    expect(context.journal.acknowledge).not.toHaveBeenCalled();
  });

  it('keeps an accepted transmission alive after the last routed subscriber is destroyed', async () => {
    const { context, api, service } = setup();
    const response = new Subject<ServiceRequestOutput>();
    api.convert.mockReturnValue(response);
    const result = service.execute(command, 1).subscribe();
    await vi.waitFor(() => expect(api.convert).toHaveBeenCalledOnce());
    result.unsubscribe();
    expect(response.observed).toBe(true);
    response.next(
      serviceRequestFixture({ status: 'converted', interventionId: 'work', taskId: 'task' }),
    );
    response.complete();
    await vi.waitFor(() => expect(context.commands.size).toBe(0));
    expect(context.journal.acknowledge).toHaveBeenCalledWith(command, 1);
  });

  it('retains status-zero outcomes and only removes a confirmed response', async () => {
    const { context, api, service } = setup();
    api.convert.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    const failed = vi.fn();
    service.execute(command, 1).subscribe({ error: failed });
    await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
    expect(context.commands.get('operation')).toEqual(command);
    expect(context.journal.acknowledge).not.toHaveBeenCalled();
    service.execute(command, 1).subscribe();
    await vi.waitFor(() => expect(context.commands.size).toBe(0));
    expect(api.convert).toHaveBeenLastCalledWith('org', command.request, command.input);
  });

  it('does not acknowledge a confirmed old-session response in a replacement account', async () => {
    const { context, api, service } = setup();
    const response = new Subject<ServiceRequestOutput>();
    api.convert.mockReturnValue(response);
    service.execute(command, 1).subscribe();
    await vi.waitFor(() => expect(api.convert).toHaveBeenCalledOnce());
    context.revision.set(2);
    response.next(serviceRequestFixture({ status: 'converted' }));
    response.complete();
    await Promise.resolve();
    expect(context.commands.size).toBe(1);
  });
});

import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { HydraApiService, type RequestOptions } from '@core/services/hydra-api';
import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';

@Injectable({ providedIn: 'root' })
export class AuditEventService extends HydraApiService {
  private static readonly BASE_PATH: string = '/api/audit-events';

  public list(options?: AuditEventListOptions): Observable<HydraCollection<AuditEventOutput>> {
    const params: NonNullable<RequestOptions['params']> = {};

    if (options?.action) params['action'] = options.action;
    if (options?.actorType) params['actorType'] = options.actorType;
    if (options?.actorId) params['actorId'] = options.actorId;
    if (options?.actorEmailHash) params['actorEmailHash'] = options.actorEmailHash;
    if (options?.subjectType) params['subjectType'] = options.subjectType;
    if (options?.subjectId) params['subjectId'] = options.subjectId;
    if (options?.clientId) params['clientId'] = options.clientId;
    if (options?.tenantId) params['tenantId'] = options.tenantId;
    if (options?.ipHash) params['ipHash'] = options.ipHash;
    if (options?.from) params['from'] = options.from;
    if (options?.to) params['to'] = options.to;

    return this.getCollection<AuditEventOutput>(AuditEventService.BASE_PATH, {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
    });
  }

  public get(id: string): Observable<AuditEventOutput> {
    return this.getOne<AuditEventOutput>(`${AuditEventService.BASE_PATH}/${id}`);
  }
}

import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  AuditEventListQuery,
  AuditEventOutput,
} from '@features/organization/features/audit/models';

/**
 * Service AuditEventService
 * @class AuditEventService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the organization audit journal: a single, read-only
 * `GET /api/organizations/{organizationId}/audit-events` list. Ordering is
 * fixed server-side (`occurredAt` DESC, `id` ASC tiebreak) — there is no
 * `order[]` param to send. `action` narrows to an exact match; `from`/`to`
 * are inclusive ISO datetimes and reject with a 400 when malformed. There
 * is no actor or subject filter and no single-event read endpoint.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class AuditEventService extends HydraApiService {
  //#region Public Methods
  /**
   * Method list
   *
   * @description
   * Retrieves a paginated page of one organization's audit events,
   * optionally narrowed by action and/or an inclusive `occurredAt` window.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to list events for.
   * @param {RequestOptions} [options] - Pagination options.
   * @param {AuditEventListQuery} [query] - Optional action/date-range narrowing.
   *
   * @return {Observable<HydraCollection<AuditEventOutput>>} An observable emitting the events collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
    query?: AuditEventListQuery,
  ): Observable<HydraCollection<AuditEventOutput>> {
    const url: string = `/api/organizations/${organizationId}/audit-events`;
    const filters: NonNullable<RequestOptions['params']> = {
      ...(query?.action ? { action: query.action } : {}),
      ...(query?.from ? { from: query.from } : {}),
      ...(query?.to ? { to: query.to } : {}),
    };

    return this.getCollection<AuditEventOutput>(url, {
      ...options,
      params: { ...options?.params, ...filters },
    });
  }
  //#endregion
}

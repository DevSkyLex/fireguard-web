import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  ApprovalActionTypeOutput,
  ApprovalRequestListQuery,
  ApprovalRequestOutput,
  DecideApprovalRequestInput,
} from '@features/organization/features/approvals/models';

/**
 * Constant ACTION_TYPES_PATH
 * @description The canonical, non-organization-scoped action-type catalog.
 */
const ACTION_TYPES_PATH: string = '/api/approvals/action-types';

/**
 * Service ApprovalRequestService
 * @class ApprovalRequestService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the four-eyes approvals inbox: listing and reading an
 * organization's approval requests, deciding on one, and reading the
 * regulated action-type catalog. `approve`/`reject` return the full
 * recomputed request — the caller replaces its cached row from it and never
 * refetches, and a successful approve means the gated action already
 * executed synchronously server-side.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ApprovalRequestService extends HydraApiService {
  //#region Public Methods
  /**
   * Method list
   *
   * @description
   * Retrieves a paginated page of one organization's approval requests,
   * optionally filtered by status and action type.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to list requests for.
   * @param {RequestOptions} [options] - Pagination options.
   * @param {ApprovalRequestListQuery} [query] - Optional status/action-type narrowing.
   *
   * @return {Observable<HydraCollection<ApprovalRequestOutput>>} An observable emitting the requests collection.
   */
  public list(
    organizationId: string,
    options?: RequestOptions,
    query?: ApprovalRequestListQuery,
  ): Observable<HydraCollection<ApprovalRequestOutput>> {
    const url: string = `/api/organizations/${organizationId}/approval-requests`;
    const filters: NonNullable<RequestOptions['params']> = {
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.actionType ? { actionType: query.actionType } : {}),
    };

    return this.getCollection<ApprovalRequestOutput>(url, {
      ...options,
      params: { ...options?.params, ...filters },
    });
  }

  /**
   * Method get
   *
   * @description Retrieves a single approval request.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - The owning organization.
   * @param {string} requestId - The request to read.
   * @return {Observable<ApprovalRequestOutput>} An observable emitting the request.
   */
  public get(organizationId: string, requestId: string): Observable<ApprovalRequestOutput> {
    const url: string = `/api/organizations/${organizationId}/approval-requests/${requestId}`;
    return this.getOne<ApprovalRequestOutput>(url);
  }

  /**
   * Method approve
   *
   * @description
   * Approves a pending request, synchronously re-executing the deferred
   * action. The caller must be ready for a **409** when the request was
   * already decided, or when the subject changed state in the meantime
   * (the request transitions to `cancelled` server-side), and a **403** on
   * self-approval or an insufficient approver role.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} requestId - The request to approve.
   * @param {DecideApprovalRequestInput} [input] - The optional decision note.
   *
   * @return {Observable<ApprovalRequestOutput>} An observable emitting the recomputed request.
   */
  public approve(
    organizationId: string,
    requestId: string,
    input?: DecideApprovalRequestInput,
  ): Observable<ApprovalRequestOutput> {
    const url: string = `/api/organizations/${organizationId}/approval-requests/${requestId}/approve`;
    return this.post<DecideApprovalRequestInput, ApprovalRequestOutput>(url, input ?? {});
  }

  /**
   * Method reject
   *
   * @description
   * Rejects a pending request; the deferred action is never executed. The
   * caller must be ready for the same 409/403 outcomes as {@link approve},
   * excluding the deferred-action-no-longer-applicable case.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The owning organization.
   * @param {string} requestId - The request to reject.
   * @param {DecideApprovalRequestInput} [input] - The optional decision note.
   *
   * @return {Observable<ApprovalRequestOutput>} An observable emitting the recomputed request.
   */
  public reject(
    organizationId: string,
    requestId: string,
    input?: DecideApprovalRequestInput,
  ): Observable<ApprovalRequestOutput> {
    const url: string = `/api/organizations/${organizationId}/approval-requests/${requestId}/reject`;
    return this.post<DecideApprovalRequestInput, ApprovalRequestOutput>(url, input ?? {});
  }

  /**
   * Method listActionTypes
   *
   * @description
   * Retrieves the regulated action-type catalog the approval policy can
   * gate — the canonical, non-organization-scoped reference catalog behind
   * both the inbox's action-type filter and the settings policy form's
   * per-action-type rule rows.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<HydraCollection<ApprovalActionTypeOutput>>} An observable emitting the catalog.
   */
  public listActionTypes(): Observable<HydraCollection<ApprovalActionTypeOutput>> {
    return this.getCollection<ApprovalActionTypeOutput>(ACTION_TYPES_PATH);
  }
  //#endregion
}

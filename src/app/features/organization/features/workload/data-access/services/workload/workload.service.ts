import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraItem } from '@core/api/models';
import type {
  CapacityExceptionInput,
  CapacityOutput,
  CapacityWeekInput,
  WorkloadAssessmentInput,
  WorkloadAssessmentOutput,
  WorkloadOutput,
  WorkloadQuery,
} from '@features/organization/features/workload/models';

/**
 * Service WorkloadService
 * @class WorkloadService
 *
 * @description
 * Organization workload transport. The server owns allocation, access and confirmation.
 *
 * @version 1.0.0
 */
@Service()
export class WorkloadService extends HydraApiService {
  /**
   * Method read
   * @method read
   *
   * @description
   * Reads all contributions in the requested window, independently of task pagination.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {WorkloadQuery} query - Organization, window and optional server filters.
   * @returns {Observable<WorkloadOutput>} Authorized daily projection.
   */
  public read(query: WorkloadQuery): Observable<WorkloadOutput> {
    const { organizationId, ...params } = query;
    return this.getOne<WorkloadOutput>(`/api/organizations/${organizationId}/workload`, { params });
  }

  /**
   * Method assess
   * @method assess
   *
   * @description
   * Simulates replacement contributions without writing assignments.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {WorkloadAssessmentInput} input - Complete proposed changes.
   * @returns {Observable<WorkloadAssessmentOutput>} Daily impact and confirmation token.
   */
  public assess(
    organizationId: string,
    input: WorkloadAssessmentInput,
  ): Observable<WorkloadAssessmentOutput> {
    return this.post<WorkloadAssessmentInput, WorkloadAssessmentOutput>(
      `/api/organizations/${organizationId}/workload/assessments`,
      input,
    );
  }

  /**
   * Method readCapacity
   * @method readCapacity
   *
   * @description
   * Reads effective weeks and exceptions for the selected scope.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string | null} memberId - Individual override, or organization defaults.
   * @returns {Observable<CapacityOutput>} Historical configuration.
   */
  public readCapacity(organizationId: string, memberId: string | null): Observable<CapacityOutput> {
    const suffix = memberId ? `members/${memberId}/capacity` : 'settings';
    return this.getOne<CapacityOutput>(`/api/organizations/${organizationId}/workload/${suffix}`);
  }

  /**
   * Method saveWeek
   * @method saveWeek
   *
   * @description
   * Adds an effective-dated week without rewriting past versions.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string | null} memberId - Individual override, or organization defaults.
   * @param {CapacityWeekInput} input - ISO Monday-through-Sunday capacities.
   * @returns {Observable<HydraItem>} Created version.
   */
  public saveWeek(
    organizationId: string,
    memberId: string | null,
    input: CapacityWeekInput,
  ): Observable<HydraItem> {
    const suffix = memberId ? `members/${memberId}/capacity` : 'settings';
    return this.post<CapacityWeekInput, HydraItem>(
      `/api/organizations/${organizationId}/workload/${suffix}`,
      input,
    );
  }

  /**
   * Method addException
   * @method addException
   *
   * @description
   * Records actual reduced availability; contradictory periods are refused.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} memberId - Affected member.
   * @param {CapacityExceptionInput} input - Inclusive dates and daily availability.
   * @returns {Observable<HydraItem>} Created exception.
   */
  public addException(
    organizationId: string,
    memberId: string,
    input: CapacityExceptionInput,
  ): Observable<HydraItem> {
    return this.post<CapacityExceptionInput, HydraItem>(
      `/api/organizations/${organizationId}/workload/members/${memberId}/exceptions`,
      input,
    );
  }

  /**
   * Method cancelException
   * @method cancelException
   *
   * @description
   * Cancels an availability exception while retaining its audit trail.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} memberId - Affected member.
   * @param {string} exceptionId - Exception to cancel.
   * @returns {Observable<void>} Completion.
   */
  public cancelException(
    organizationId: string,
    memberId: string,
    exceptionId: string,
  ): Observable<void> {
    return this.delete(
      `/api/organizations/${organizationId}/workload/members/${memberId}/exceptions/${exceptionId}`,
    );
  }
}

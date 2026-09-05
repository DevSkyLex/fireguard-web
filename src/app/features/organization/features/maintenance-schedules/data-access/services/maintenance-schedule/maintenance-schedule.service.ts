import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceCampaignOutput,
  MaintenanceScheduleExportOptions,
  MaintenanceScheduleListOptions,
  MaintenanceScheduleOutput,
  UpdateMaintenanceScheduleInput,
} from '@features/organization/features/maintenance-schedules/models';

/**
 * Constant SCHEDULES_PATH
 * @description The canonical, non-organization-scoped schedules collection.
 */
const SCHEDULES_PATH: string = '/api/maintenance/schedules';

/**
 * Constant CAMPAIGNS_PATH
 * @description The campaign-generation action endpoint.
 */
const CAMPAIGNS_PATH: string = '/api/maintenance/campaigns';

/**
 * Service MaintenanceScheduleService
 * @class MaintenanceScheduleService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the Maintenance module: listing schedules, overriding a
 * schedule's interval, and generating an inspection campaign from the
 * schedules currently due. Unlike most feature services here, the list and
 * campaign endpoints are the **canonical** bare resources
 * (`/api/maintenance/…`), not organization-scoped paths — the organization
 * is instead a required filter/input field, the same shape
 * `InspectionService.listByIntervention` already uses for its own
 * canonical-collection bypass.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MaintenanceScheduleService extends HydraApiService {
  /**
   * Method list
   *
   * @description
   * Retrieves a paginated list of maintenance schedules scoped to one
   * organization, optionally searched and narrowed by facility, equipment
   * type, due-status and a `dueBefore` upper bound.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MaintenanceScheduleListOptions} options - Required `organization` IRI plus optional narrowing, pagination and sort.
   *
   * @return {Observable<HydraCollection<MaintenanceScheduleOutput>>} An observable emitting the schedules collection.
   */
  public list(
    options: MaintenanceScheduleListOptions,
  ): Observable<HydraCollection<MaintenanceScheduleOutput>> {
    const params: NonNullable<RequestOptions['params']> = { ...options.params };

    params['organization'] = options.organization;
    if (options.facility) params['facility'] = options.facility;
    if (options.equipmentType) params['equipmentType'] = options.equipmentType;
    if (options.dueStatus) params['dueStatus'] = options.dueStatus;
    if (options.dueBefore) params['dueBefore'] = options.dueBefore;

    return this.getCollection<MaintenanceScheduleOutput>(SCHEDULES_PATH, {
      page: options.page,
      itemsPerPage: options.itemsPerPage,
      search: options.search,
      sort: options.sort,
      params,
    });
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Reads the organization's maintenance-schedules export as CSV
   * (`GET /api/maintenance/schedules/export`). Like {@link list}, the
   * organization travels as a required `organization` IRI query parameter;
   * the optional `facility`/`equipmentType`/`dueStatus` narrowing is
   * forwarded the same way — `dueBefore` is not part of the export's
   * contract. The collection is capped server-side at 50,000 rows; past it
   * the endpoint answers `422` with an RFC 7807 `detail` instead of the
   * file. Calls `this.http` directly for a response shape
   * (`responseType: 'blob'`) the base class does not support.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {MaintenanceScheduleExportOptions} options - Required `organization` IRI plus optional narrowing.
   *
   * @return {Observable<Blob>} The export's CSV binary content.
   */
  public exportCsv(options: MaintenanceScheduleExportOptions): Observable<Blob> {
    const params: NonNullable<RequestOptions['params']> = {};

    params['organization'] = options.organization;
    if (options.facility) params['facility'] = options.facility;
    if (options.equipmentType) params['equipmentType'] = options.equipmentType;
    if (options.dueStatus) params['dueStatus'] = options.dueStatus;

    return this.http.get(this.buildUrl(`${SCHEDULES_PATH}/export`), {
      params: this.buildParams({ params }),
      responseType: 'blob',
      withCredentials: true,
    });
  }

  /**
   * Method setIntervalOverride
   *
   * @description
   * Merge-patches a schedule's `intervalOverride` — an ISO-8601 duration
   * bounded `[P28D, P10Y]`, or `null` to clear it back to the organization
   * default. The response is the full recomputed schedule; the caller
   * replaces its cached row from it and never refetches.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} scheduleId - The schedule to update.
   * @param {string | null} intervalOverride - The new override, or `null` to clear it.
   *
   * @return {Observable<MaintenanceScheduleOutput>} An observable emitting the recomputed schedule.
   */
  public setIntervalOverride(
    scheduleId: string,
    intervalOverride: string | null,
  ): Observable<MaintenanceScheduleOutput> {
    return this.patch<UpdateMaintenanceScheduleInput, MaintenanceScheduleOutput>(
      `${SCHEDULES_PATH}/${scheduleId}`,
      { intervalOverride },
    );
  }

  /**
   * Method generateCampaign
   *
   * @description
   * Synchronously generates an inspection campaign from every due/overdue
   * schedule matching the given scope. A 422
   * `MaintenanceValidationException` means the scope matched zero due
   * schedules — the caller surfaces that inline, not as a generic toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {GenerateMaintenanceCampaignInput} input - The campaign's scope and name.
   *
   * @return {Observable<MaintenanceCampaignOutput>} An observable emitting the created intervention's id, number and work-item count.
   */
  public generateCampaign(
    input: GenerateMaintenanceCampaignInput,
  ): Observable<MaintenanceCampaignOutput> {
    return this.post<GenerateMaintenanceCampaignInput, MaintenanceCampaignOutput>(
      CAMPAIGNS_PATH,
      input,
    );
  }
}

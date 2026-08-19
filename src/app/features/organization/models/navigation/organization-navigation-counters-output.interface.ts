import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationNavigationCountersOutput
 * @interface OrganizationNavigationCountersOutput
 *
 * @description
 * Lightweight badge counters for the sidebar navigation. Each counter
 * degrades to `0` rather than a 403 when the caller lacks its underlying
 * read permission (`organization.interventions.read` /
 * `organization.inspection.read` / `organization.interventions.review`) —
 * the caller only needs an active membership to reach the endpoint.
 */
export interface OrganizationNavigationCountersOutput extends HydraItem {
  /** Open field interventions, excluding the `published`/`abandoned` end states. */
  readonly openInterventions: number;
  /** Non-conformities currently `open` or `in_progress`. */
  readonly openNonConformities: number;
  /** Interventions awaiting review (status `submitted`). */
  readonly submittedInterventions: number;
}

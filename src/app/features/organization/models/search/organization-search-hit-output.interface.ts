import type { OrganizationSearchResultType } from './organization-search-result-type.type';

/**
 * Interface OrganizationSearchHitOutput
 * @interface OrganizationSearchHitOutput
 *
 * @description
 * One global-search hit. The API deliberately ships no URL — the frontend
 * builds the route from `type` + `id`. `subtitle` and `extra` are optional
 * tertiary hints (API Platform omits null fields, so both arrive as
 * `undefined` rather than `null` when absent).
 *
 * Per type: equipment titles as brand+model with the serial number as
 * subtitle and the location label as extra; facility as name/code/address;
 * intervention as name/number; inspection as checklist reference or id;
 * non-conformity as truncated description/severity/status.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationSearchHitOutput {
  //#region Properties
  /** @type {OrganizationSearchResultType} */
  readonly type: OrganizationSearchResultType;
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly title: string;
  /** @type {string | null | undefined} */
  readonly subtitle?: string | null;
  /** @type {string | null | undefined} */
  readonly extra?: string | null;
  /** Owning record id when the match has no page of its own — a non-conformity carries its inspection id. @type {string | null | undefined} */
  readonly parentId?: string | null;
  //#endregion
}

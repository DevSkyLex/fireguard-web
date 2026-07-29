import type { CallState } from '@core/request-state';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Interface ActiveOrganizationState
 * @interface ActiveOrganizationState
 *
 * @description
 * Minimal root-level state for the currently selected / active organization.
 * Only tracks the routing context (which org is being viewed).
 * All list management and CRUD operations live in
 * the component-scoped {@link OrganizationStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveOrganizationState {
  //#region Properties
  /**
   * Property routedOrganizationId
   * @readonly
   *
   * @description
   * Identifier the URL currently designates, read from the activated route
   * tree on every navigation. This — not the cached entity — is what makes an
   * organization "active": the URL is the source of truth, so the context can
   * never lag behind it while a fetch is in flight.
   *
   * @since 1.1.0
   *
   * @type {string | null}
   */
  readonly routedOrganizationId: string | null;

  /**
   * Property organizationEntity
   * @readonly
   *
   * @description
   * Cached organization resource, seeded by the resolver. Kept behind the
   * `selectedOrganization` computed, which only exposes it while it matches
   * {@link routedOrganizationId} — otherwise a switch would show the previous
   * organization's name until its fetch resolves.
   *
   * @since 1.1.0
   *
   * @type {OrganizationOutput | null}
   */
  readonly organizationEntity: OrganizationOutput | null;

  /**
   * Property getCallState
   * @readonly
   *
   * @description
   * Call state for fetching the selected organization, driven by the resolver.
   *
   * @since 1.0.0
   *
   * @type {CallState<OrganizationOutput | null>}
   */
  readonly getCallState: CallState<OrganizationOutput | null>;
  //#endregion
}

import type { Signal } from '@angular/core';
import type { MemberDirectoryEntry } from '@features/organization/models';

/**
 * MemberDirectoryPort
 * @interface MemberDirectoryPort
 *
 * @description
 * Feature-owned contract resolving a bare member id to a display name and an
 * avatar, for surfaces that receive member references and nothing else.
 *
 * It exists because member IRIs are not dereferenceable on this API: messaging
 * hands out `/api/organizations/{orgId}/members/{memberId}` with no GET route
 * behind it, so without a directory every author and participant renders as a
 * UUID.
 *
 * Reading the directory needs `organization.members.read`, which messaging
 * permissions do **not** imply. {@link isAvailable} reports whether the
 * directory can be read at all; when it is false, callers must degrade to a
 * neutral member label rather than show an error or expose the transport id.
 *
 * Concrete implementation: `MemberDirectoryStore` in
 * `features/organization/state/member-directory/`.
 * Binding: `features/organization/organization.feature.ts`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MemberDirectoryPort {
  //#region Properties
  /**
   * Property byId
   * @readonly
   *
   * @description
   * Loaded members, keyed by their bare member id.
   *
   * @type {Signal<ReadonlyMap<string, MemberDirectoryEntry>>}
   */
  readonly byId: Signal<ReadonlyMap<string, MemberDirectoryEntry>>;

  /**
   * Property isAvailable
   * @readonly
   *
   * @description
   * Whether the acting user may read the directory at all. False means the
   * caller must fall back to raw ids, not that loading failed.
   *
   * @type {Signal<boolean>}
   */
  readonly isAvailable: Signal<boolean>;

  /**
   * Property isLoading
   * @readonly
   *
   * @type {Signal<boolean>}
   */
  readonly isLoading: Signal<boolean>;
  //#endregion

  //#region Methods
  /**
   * Method ensureLoaded
   *
   * @description
   * Loads the directory for an organization if it is not already loaded for
   * that organization. Idempotent, and a no-op without the permission.
   *
   * @param {string} organizationId - Bare organization UUID.
   *
   * @returns {void}
   */
  ensureLoaded(organizationId: string): void;

  /**
   * Method displayNameFor
   *
   * @description
   * Best available label for a member reference, accepting either a bare id or
   * a member IRI. Falls back to a neutral localized label.
   *
   * @param {string} memberIdOrIri - Bare member UUID or member IRI.
   *
   * @returns {string} A never-blank label.
   */
  displayNameFor(memberIdOrIri: string): string;
  //#endregion
}

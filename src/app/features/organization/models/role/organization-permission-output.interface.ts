import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationPermissionOutput
 * @interface OrganizationPermissionOutput
 *
 * @description
 * A permission catalog entry, as served by
 * `GET /organizations/{organizationId}/permissions`.
 *
 * The API exposes no `id`: `name` is the identifier, and `description` is
 * always a string — the backend defaults it to `''` rather than sending null.
 */
export interface OrganizationPermissionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly description: string;
  //#endregion
}

/**
 * Type OrganizationPermissionDescriptor
 *
 * @description
 * The same permission as it appears **embedded** in a role's `permissions`.
 *
 * The backend reuses one DTO for both, but an embedded object is not an API
 * Platform resource, so it arrives without the Hydra keys — modelling the two
 * as one type is what let a role's permissions be typed as bare strings and
 * crash the permission matrix.
 *
 * @since 1.1.0
 */
export type OrganizationPermissionDescriptor = Pick<
  OrganizationPermissionOutput,
  'name' | 'description'
>;

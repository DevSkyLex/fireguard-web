import type { CallState } from '@core/request-state';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';

/**
 * Interface OrganizationSettingsState
 * @interface OrganizationSettingsState
 *
 * @description
 * State for the organization settings workflow: one named call state per
 * mutation, because the page runs several independent danger-zone actions and
 * a shared state would leak one action's error into another's control.
 */
export interface OrganizationSettingsState {
  readonly saveCallState: CallState<OrganizationOutput>;
  readonly uploadLogoCallState: CallState<OrganizationOutput>;
  readonly removeLogoCallState: CallState<void>;
  readonly deleteCallState: CallState<void>;
  readonly transferOwnershipCallState: CallState<OrganizationOutput>;
  readonly statusCallState: CallState<OrganizationOutput>;
  readonly leaveCallState: CallState<void>;
}

/**
 * Interface OrganizationSettingsSaveParams
 * @interface OrganizationSettingsSaveParams
 *
 * @description
 * Parameters of the settings save action.
 */
export interface OrganizationSettingsSaveParams {
  readonly organizationId: string;
  readonly input: UpdateOrganizationInput;
}

/**
 * Interface OrganizationSettingsLogoParams
 * @interface OrganizationSettingsLogoParams
 *
 * @description
 * Parameters of the logo upload action.
 */
export interface OrganizationSettingsLogoParams {
  readonly organizationId: string;
  readonly file: Blob;
  readonly fileName?: string;
}

/**
 * Interface OrganizationSettingsDeleteParams
 * @interface OrganizationSettingsDeleteParams
 *
 * @description
 * Parameters of the organization archive action. `slug` is the danger-zone
 * confirmation the caller retyped; the backend refuses the call with 422 when
 * it does not match, so it is required rather than optional.
 */
export interface OrganizationSettingsDeleteParams {
  readonly organizationId: string;
  readonly slug: string;
}

/**
 * Interface OrganizationSettingsTransferOwnershipParams
 * @interface OrganizationSettingsTransferOwnershipParams
 *
 * @description
 * Parameters of the ownership transfer action. `newOwnerUserId` is the target
 * member's `userId`, not their membership id, and `slug` is the same
 * danger-zone confirmation the archive action takes.
 */
export interface OrganizationSettingsTransferOwnershipParams {
  readonly organizationId: string;
  readonly newOwnerUserId: string;
  readonly slug: string;
}

/**
 * Interface OrganizationSettingsStatusParams
 * @interface OrganizationSettingsStatusParams
 *
 * @description
 * Parameters of the suspend and restore actions.
 */
export interface OrganizationSettingsStatusParams {
  readonly organizationId: string;
}

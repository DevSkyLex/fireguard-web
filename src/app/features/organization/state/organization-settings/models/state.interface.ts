import type { CallState } from '@core/state/request-state';
import type { OrganizationOutput, UpdateOrganizationInput } from '@features/organization/models';

/**
 * Interface OrganizationSettingsState
 * @interface OrganizationSettingsState
 *
 * @description
 * State for the organization settings workflow: one call state per mutation
 * (settings save, logo upload, organization deletion).
 */
export interface OrganizationSettingsState {
  readonly saveCallState: CallState<OrganizationOutput>;
  readonly uploadLogoCallState: CallState<OrganizationOutput>;
  readonly deleteCallState: CallState<void>;
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
 * Parameters of the organization deletion action.
 */
export interface OrganizationSettingsDeleteParams {
  readonly organizationId: string;
}

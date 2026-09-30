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
  /**
   * Property saveCallState
   * @readonly
   *
   * @description
   * Tracks general settings saves independently from other settings commands.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationOutput>}
   */
  readonly saveCallState: CallState<OrganizationOutput>;

  /**
   * Property uploadLogoCallState
   * @readonly
   *
   * @description
   * Tracks logo upload requests and their returned organization snapshot.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<OrganizationOutput>}
   */
  readonly uploadLogoCallState: CallState<OrganizationOutput>;

  /**
   * Property removeLogoCallState
   * @readonly
   *
   * @description
   * Tracks removal of the current organization logo.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<void>}
   */
  readonly removeLogoCallState: CallState<void>;

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Tracks the organization archive request.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {CallState<void>}
   */
  readonly deleteCallState: CallState<void>;

  /**
   * Property transferOwnershipCallState
   * @readonly
   *
   * @description
   * Tracks ownership transfer and its returned organization snapshot.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationOutput>}
   */
  readonly transferOwnershipCallState: CallState<OrganizationOutput>;

  /**
   * Property statusCallState
   * @readonly
   *
   * @description
   * Tracks organization suspension or restoration.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<OrganizationOutput>}
   */
  readonly statusCallState: CallState<OrganizationOutput>;

  /**
   * Property leaveCallState
   * @readonly
   *
   * @description
   * Tracks the active member's departure from the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<void>}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization whose general settings are being saved.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Contains the validated general settings submitted to the organization API.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {UpdateOrganizationInput}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization receiving the uploaded logo.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property file
   * @readonly
   *
   * @description
   * Supplies the selected image bytes for the logo upload.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Blob}
   */
  readonly file: Blob;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Preserves the selected image's filename when the transport supports it.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization selected for archival.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Contains the danger-zone confirmation the operator retyped.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization whose ownership will change.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property newOwnerUserId
   * @readonly
   *
   * @description
   * Identifies the target member's user account, not the membership record.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly newOwnerUserId: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Contains the danger-zone confirmation the operator retyped.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Selects the organization to suspend or restore.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
}

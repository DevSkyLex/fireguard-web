/**
 * Organization Setup Types
 *
 * @description
 * Public DTOs and input contracts exposed by the organization setup boundary.
 * These types are intentionally owned by `@features/organization/setup` so
 * onboarding and other approved consumers do not depend on internal
 * organization subfeature model types.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

/**
 * Interface SetupCreateOrganizationInput
 * @interface SetupCreateOrganizationInput
 *
 * @description
 * Input payload used to create an organization through the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupCreateOrganizationInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Display name of the organization to create.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Optional custom slug to associate with the organization.
   *
   * @type {string | null | undefined}
   */
  readonly slug?: string | null;
}

/**
 * Interface SetupInviteMemberInput
 * @interface SetupInviteMemberInput
 *
 * @description
 * Input payload used to invite a member through the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupInviteMemberInput {
  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address of the invited member.
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property roleIds
   * @readonly
   *
   * @description
   * Optional role identifiers assigned to the invited member.
   *
   * @type {ReadonlyArray<string | null> | undefined}
   */
  readonly roleIds?: ReadonlyArray<string | null>;
}

/**
 * Type SetupFacilityType
 * @type {SetupFacilityType}
 *
 * @description
 * Facility types exposed by the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type SetupFacilityType = 'site' | 'building' | 'floor' | 'zone' | 'area';

/**
 * Interface SetupFacilityAddressMatch
 * @interface SetupFacilityAddressMatch
 * @description Single geocoded address offered for explicit selection during facility setup.
 * @since 1.0.0
 */
export interface SetupFacilityAddressMatch {
  /**
   * Property displayName
   * @readonly
   * @description Canonical postal address returned by the geocoding provider.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property street
   * @readonly
   * @description Provider-supplied street and optional house number; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly street?: string;

  /**
   * Property city
   * @readonly
   * @description Provider-supplied locality; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly city?: string;

  /**
   * Property region
   * @readonly
   * @description Provider-supplied state or province when available; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly region?: string;

  /**
   * Property country
   * @readonly
   * @description Provider-supplied country name; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly country?: string;

  /**
   * Property countryCode
   * @readonly
   * @description ISO 3166-1 alpha-2 country code from the provider; absent on older responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly countryCode?: string;

  /**
   * Property postalCode
   * @readonly
   * @description Provider-supplied postal code when available; absent on older API responses.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly postalCode?: string;

  /**
   * Property latitude
   * @readonly
   * @description Latitude of the selected address in decimal degrees.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly latitude: number;

  /**
   * Property longitude
   * @readonly
   * @description Longitude of the selected address in decimal degrees.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly longitude: number;
}

/**
 * Interface SetupCreateFacilityInput
 * @interface SetupCreateFacilityInput
 *
 * @description
 * Input payload used to create a facility through the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupCreateFacilityInput {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Facility type to create.
   *
   * @type {SetupFacilityType}
   */
  readonly type: SetupFacilityType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Display name of the facility.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property address
   * @readonly
   *
   * @description
   * Optional postal or freeform address attached to the facility.
   *
   * @type {string | null | undefined}
   */
  readonly address?: string | null;

  /**
   * Property latitude
   * @readonly
   * @description Optional latitude selected from an address suggestion.
   * @access public
   * @since 1.0.0
   * @type {number | null | undefined}
   */
  readonly latitude?: number | null;

  /**
   * Property longitude
   * @readonly
   * @description Optional longitude selected from an address suggestion.
   * @access public
   * @since 1.0.0
   * @type {number | null | undefined}
   */
  readonly longitude?: number | null;
}

/**
 * Interface SetupFacilitySummary
 * @interface SetupFacilitySummary
 *
 * @description
 * Minimal representation of a facility created through the setup boundary,
 * enough for consumers to reference it (equipment attachment) and to name it.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupFacilitySummary {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the created facility.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Display name of the created facility.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * The facility's type, so a consumer can name it beside the facility.
   *
   * @type {SetupFacilityType}
   */
  readonly type: SetupFacilityType;
}

/**
 * Interface SetupOrganizationRole
 * @interface SetupOrganizationRole
 *
 * @description
 * Role summary exposed by the setup boundary for invitation flows.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupOrganizationRole {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the organization role.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Role name displayed to the user.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional description clarifying the role permissions.
   *
   * @type {string | null}
   */
  readonly description: string | null;
}

/**
 * Interface SetupEquipmentSummary
 * @interface SetupEquipmentSummary
 *
 * @description
 * Minimal equipment representation exposed by the setup boundary for forms and
 * selectors.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupEquipmentSummary {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the equipment.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Equipment type label.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property serialNumber
   * @readonly
   *
   * @description
   * Optional serial number displayed in equipment selectors.
   *
   * @type {string | null}
   */
  readonly serialNumber: string | null;
}

/**
 * Interface SetupCreateEquipmentInput
 * @interface SetupCreateEquipmentInput
 *
 * @description
 * Input payload used to create an equipment record through the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupCreateEquipmentInput {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Equipment type identifier.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property brand
   * @readonly
   *
   * @description
   * Optional equipment brand.
   *
   * @type {string | null | undefined}
   */
  readonly brand?: string | null;

  /**
   * Property model
   * @readonly
   *
   * @description
   * Optional equipment model.
   *
   * @type {string | null | undefined}
   */
  readonly model?: string | null;

  /**
   * Property serialNumber
   * @readonly
   *
   * @description
   * Optional equipment serial number.
   *
   * @type {string | null | undefined}
   */
  readonly serialNumber?: string | null;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Optional identifier of the facility the equipment is assigned to at
   * creation time — the setup boundary maps it to the transport IRI.
   *
   * @type {string | null | undefined}
   */
  readonly facilityId?: string | null;
}

/**
 * Type SetupInspectionResult
 * @type {SetupInspectionResult}
 *
 * @description
 * Inspection result values exposed by the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type SetupInspectionResult = 'pass' | 'fail' | 'partial';

/**
 * Type SetupInspectorType
 * @type {SetupInspectorType}
 *
 * @description
 * Inspector source values exposed by the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type SetupInspectorType = 'user' | 'external';

/**
 * Interface SetupCreateInspectionInput
 * @interface SetupCreateInspectionInput
 *
 * @description
 * Input payload used to create an inspection through the setup boundary.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetupCreateInspectionInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Identifier of the inspected equipment.
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property result
   * @readonly
   *
   * @description
   * Outcome of the inspection.
   *
   * @type {SetupInspectionResult}
   */
  readonly result: SetupInspectionResult;

  /**
   * Property performedAt
   * @readonly
   *
   * @description
   * ISO timestamp describing when the inspection was performed.
   *
   * @type {string}
   */
  readonly performedAt: string;

  /**
   * Property inspectorType
   * @readonly
   *
   * @description
   * Origin of the inspector who performed the inspection.
   *
   * @type {SetupInspectorType}
   */
  readonly inspectorType: SetupInspectorType;

  /**
   * Property inspectorName
   * @readonly
   *
   * @description
   * Display name of the person who performed the inspection.
   *
   * @type {string}
   */
  readonly inspectorName: string;
}

/**
 * Interface SetupOperationContext
 * @interface SetupOperationContext
 * @description Optional durable creation receipt. Both fields are validated together by the server.
 * @since 1.1.0
 */
export interface SetupOperationContext {
  readonly onboardingSessionId: string;
  readonly onboardingItemKey: string;
}

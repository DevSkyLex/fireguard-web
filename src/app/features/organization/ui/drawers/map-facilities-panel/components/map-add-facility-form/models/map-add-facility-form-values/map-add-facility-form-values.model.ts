/**
 * Type MapAddFacilityFormValues
 *
 * @description
 * Trimmed field values emitted by {@link MapAddFacilityForm} on submit. The
 * page combines these with the map's current center to build the create
 * payload — this form knows nothing about coordinates or the organization.
 *
 * @since 1.0.0
 */
export interface MapAddFacilityFormValues {
  readonly name: string;
  readonly city: string;
}

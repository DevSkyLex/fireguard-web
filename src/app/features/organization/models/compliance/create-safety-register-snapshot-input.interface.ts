/**
 * Interface CreateSafetyRegisterSnapshotInput
 * @interface CreateSafetyRegisterSnapshotInput
 *
 * @description
 * Body of the snapshot archive request
 * (`POST /organizations/{organizationId}/compliance/register-snapshots`):
 * pass `facilityId` for a facility-scoped register, omit it — an empty
 * object — for the organization-wide one.
 */
export interface CreateSafetyRegisterSnapshotInput {
  //#region Properties
  /** The facility to scope the archived register to, when any. */
  readonly facilityId?: string;
  //#endregion
}

/**
 * Interface UpdateMaintenanceScheduleInput
 * @interface UpdateMaintenanceScheduleInput
 *
 * @description
 * Merge-patch payload for `PATCH /api/maintenance/schedules/{id}` — the
 * single writable field. An ISO-8601 duration bounded `[P28D, P10Y]`, or an
 * explicit `null` to clear the override and fall back to the organization
 * default. `undefined` must never be sent in place of `null`: JSON Merge
 * Patch drops an `undefined` key from the body entirely, which leaves the
 * override untouched instead of clearing it.
 *
 * @since 1.0.0
 */
export interface UpdateMaintenanceScheduleInput {
  /** @type {string | null} */
  readonly intervalOverride: string | null;
}

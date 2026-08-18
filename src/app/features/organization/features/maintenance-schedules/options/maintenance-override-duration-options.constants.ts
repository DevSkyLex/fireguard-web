/**
 * Constant MAINTENANCE_OVERRIDE_DURATION_OPTIONS
 * @const MAINTENANCE_OVERRIDE_DURATION_OPTIONS
 *
 * @description
 * The standard interval-override choices offered for a maintenance
 * schedule, as ISO-8601 durations — the exact wire format
 * `UpdateMaintenanceScheduleInput.intervalOverride` carries. Bounded to the
 * backend's accepted range `[P28D, P10Y]` (`ARCHITECTURE.md` API contract),
 * mirroring `ORGANIZATION_PERIODICITY_OPTIONS`
 * (`organization/ui/forms/organization-compliance-form/options`) but with
 * the schedule-specific floor and ceiling both represented as explicit
 * choices rather than left implicit.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const MAINTENANCE_OVERRIDE_DURATION_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  { label: $localize`:@@maintenance.override.durationP28D:Every 4 weeks`, value: 'P28D' },
  { label: $localize`:@@maintenance.override.durationP1M:Every month`, value: 'P1M' },
  { label: $localize`:@@maintenance.override.durationP3M:Every 3 months`, value: 'P3M' },
  { label: $localize`:@@maintenance.override.durationP6M:Every 6 months`, value: 'P6M' },
  { label: $localize`:@@maintenance.override.durationP1Y:Every year`, value: 'P1Y' },
  { label: $localize`:@@maintenance.override.durationP2Y:Every 2 years`, value: 'P2Y' },
  { label: $localize`:@@maintenance.override.durationP5Y:Every 5 years`, value: 'P5Y' },
  { label: $localize`:@@maintenance.override.durationP10Y:Every 10 years`, value: 'P10Y' },
];

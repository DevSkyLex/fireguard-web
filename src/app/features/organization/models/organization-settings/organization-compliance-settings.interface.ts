/**
 * Interface OrganizationComplianceSettings
 * @interface OrganizationComplianceSettings
 *
 * @description
 * Organization-wide compliance policy: effective non-conformity resolution
 * SLAs per severity, effective inspection periodicity per equipment type, and
 * the reminder window. The two maps carry EFFECTIVE values — catalog
 * defaults overlaid with the organization's own customizations; the
 * `customized*` lists name which keys are organization-specific so the UI
 * never has to guess provenance.
 */
export interface OrganizationComplianceSettings {
  //#region Properties
  /** @type {Readonly<Record<string, number>>} */
  readonly nonConformitySlaDays: Readonly<Record<string, number>>;
  /** @type {Readonly<Record<string, string>>} */
  readonly inspectionPeriodicityDefaults: Readonly<Record<string, string>>;
  /** @type {number} */
  readonly reminderWindowDays: number;
  /** @type {ReadonlyArray<string>} */
  readonly customizedSlaSeverities: ReadonlyArray<string>;
  /** @type {ReadonlyArray<string>} */
  readonly customizedPeriodicityTypes: ReadonlyArray<string>;
  //#endregion
}

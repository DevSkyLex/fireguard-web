/**
 * Interface MaintenanceCampaignDraft
 * @interface
 *
 * @description
 * The campaign form's own field shape: `dueBefore` as the plain
 * `yyyy-MM-dd` value a native date input produces, `facility` and
 * `equipmentType` as the sentinel `''` when left unscoped. Converted to
 * `GenerateMaintenanceCampaignInput` on submit, once the organization IRI —
 * which the form does not own — is folded in by the page.
 *
 * @since 1.0.0
 */
export interface MaintenanceCampaignDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this maintenance campaign.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property dueBefore
   * @readonly
   *
   * @description
   * Limits maintenance schedules to items due before this date.
   *
   * @access public
   *
   * @type {string}
   */
  readonly dueBefore: string;

  /**
   * Property facility
   * @readonly
   *
   * @description
   * Filters maintenance schedules to the selected facility.
   *
   * @access public
   *
   * @type {string}
   */
  readonly facility: string;

  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Filters maintenance schedules to the selected equipment type.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentType: string;
}

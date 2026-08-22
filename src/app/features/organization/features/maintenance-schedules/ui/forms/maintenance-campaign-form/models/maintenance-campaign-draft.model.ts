/**
 * Interface MaintenanceCampaignDraft
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
  readonly name: string;
  readonly dueBefore: string;
  readonly facility: string;
  readonly equipmentType: string;
}

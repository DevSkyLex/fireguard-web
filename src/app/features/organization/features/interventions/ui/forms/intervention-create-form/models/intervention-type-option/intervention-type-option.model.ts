/**
 * Interface InterventionTypeOption
 *
 * @description
 * One intervention type as rendered by the creation form's radio-card group:
 * the value written to the `type` control, plus the card's label, blurb and
 * decorative icon.
 *
 * @since 1.1.0
 */
export interface InterventionTypeOption {
  /** Intervention type written to the `type` control when the card is picked. */
  readonly value: string;

  /** Card title. */
  readonly label: string;

  /** Optional supporting line under the title. */
  readonly description?: string;

  /** PrimeIcons class shown on the card. */
  readonly icon?: string;
}

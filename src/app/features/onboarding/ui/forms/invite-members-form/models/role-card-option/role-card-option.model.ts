/**
 * Interface RoleCardOption
 *
 * @description
 * One organization role as rendered by an invitee row's radio-card group:
 * the role id carried by the form control, plus the card's label and blurb.
 *
 * @since 1.1.0
 */
export interface RoleCardOption {
  /** Role id written to the row's `roleId` control when the card is picked. */
  readonly value: string;

  /** Card title. */
  readonly label: string;

  /** Optional supporting line under the title. `null` when the role has none. */
  readonly description?: string | null;
}

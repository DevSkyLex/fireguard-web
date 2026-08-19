/**
 * Type InterventionRecurrenceFrequency
 * @type InterventionRecurrenceFrequency
 *
 * @description
 * A recurrence's cadence unit, combined with `interval` (e.g. `interval: 3`
 * + `frequency: 'monthly'` = every 3 months). Literals match the backend
 * `RecurrenceFrequency` value object byte for byte.
 */
export type InterventionRecurrenceFrequency =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

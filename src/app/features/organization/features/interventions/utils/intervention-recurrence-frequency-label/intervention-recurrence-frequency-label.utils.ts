import type { InterventionRecurrenceFrequency } from '@features/organization/features/interventions/models';

/**
 * Function interventionRecurrenceFrequencyLabel
 *
 * @description
 * Names a recurrence's cadence unit for display — the table's cadence column,
 * the sheet's frequency select, and the create/edit form share this label set.
 *
 * @param {InterventionRecurrenceFrequency} frequency - Cadence unit to name.
 *
 * @returns {string} Localized label for `frequency`.
 *
 * @since 1.0.0
 */
export function interventionRecurrenceFrequencyLabel(
  frequency: InterventionRecurrenceFrequency,
): string {
  switch (frequency) {
    case 'weekly':
      return $localize`:@@intervention.recurrences.frequency.weekly:Weekly`;
    case 'monthly':
      return $localize`:@@intervention.recurrences.frequency.monthly:Monthly`;
    case 'quarterly':
      return $localize`:@@intervention.recurrences.frequency.quarterly:Quarterly`;
    case 'semiannual':
      return $localize`:@@intervention.recurrences.frequency.semiannual:Every 6 months`;
    case 'annual':
      return $localize`:@@intervention.recurrences.frequency.annual:Yearly`;
  }
}

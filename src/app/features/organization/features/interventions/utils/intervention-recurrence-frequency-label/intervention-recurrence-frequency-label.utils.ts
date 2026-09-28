import type { InterventionRecurrenceFrequency } from '@features/organization/features/interventions/models';

/**
 * Function bareFrequencyLabel
 *
 * @description
 * Names a cadence unit on its own, with no multiplier — `interval` 1 or
 * omitted.
 *
 * @param {InterventionRecurrenceFrequency} frequency - Cadence unit to name.
 *
 * @returns {string} Localized bare label for `frequency`.
 *
 * @since 1.0.0
 */
function bareFrequencyLabel(frequency: InterventionRecurrenceFrequency): string {
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

/**
 * Function cadenceFrequencyLabel
 *
 * @description
 * Spells out a cadence multiplied by `interval` above 1 — "Every 2 weeks",
 * never "2× Weekly", which a reader parses as "twice a week".
 *
 * @param {InterventionRecurrenceFrequency} frequency - Cadence unit to name.
 * @param {number} interval - The multiplier, above 1.
 *
 * @returns {string} Localized "Every N …" label.
 *
 * @since 6.4.0
 */
function cadenceFrequencyLabel(
  frequency: InterventionRecurrenceFrequency,
  interval: number,
): string {
  switch (frequency) {
    case 'weekly':
      return $localize`:@@intervention.recurrences.frequency.everyWeeks:Every ${interval}:interval: weeks`;
    case 'monthly':
      return $localize`:@@intervention.recurrences.frequency.everyMonths:Every ${interval}:interval: months`;
    case 'quarterly':
      return $localize`:@@intervention.recurrences.frequency.everyQuarters:Every ${interval}:interval: quarters`;
    case 'semiannual':
      return $localize`:@@intervention.recurrences.frequency.everyHalfYears:Every ${interval}:interval: half-years`;
    case 'annual':
      return $localize`:@@intervention.recurrences.frequency.everyYears:Every ${interval}:interval: years`;
  }
}

/**
 * Function interventionRecurrenceFrequencyLabel
 *
 * @description
 * Names a recurrence's cadence for display. Called with `frequency` alone —
 * the sheet's and the create/edit form's frequency select — it names the bare
 * unit. Called with `interval` too — the table's cadence column — it spells
 * out the multiplier for any value above 1 ("Every 2 weeks") instead of the
 * ambiguous "2× Weekly", which reads as twice a week rather than once every
 * two weeks. The plural branch is chosen with {@link Intl.PluralRules} on
 * `locale` rather than baked into one `$localize` ICU block, so each branch
 * stays its own translatable id.
 *
 * @param {InterventionRecurrenceFrequency} frequency - Cadence unit to name.
 * @param {number} [interval] - Cadence multiplier applied to `frequency`. Omit for the bare unit label.
 * @param {string} [locale] - Active locale, deciding whether `interval` reads as singular. Defaults to `'en'`.
 *
 * @returns {string} Localized label for `frequency` and `interval`.
 *
 * @since 1.0.0
 */
export function interventionRecurrenceFrequencyLabel(
  frequency: InterventionRecurrenceFrequency,
  interval?: number,
  locale = 'en',
): string {
  if (interval === undefined) return bareFrequencyLabel(frequency);

  const category: Intl.LDMLPluralRule = new Intl.PluralRules(locale).select(interval);

  return category === 'one'
    ? bareFrequencyLabel(frequency)
    : cadenceFrequencyLabel(frequency, interval);
}

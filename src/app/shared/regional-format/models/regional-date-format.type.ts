/**
 * Type RegionalDateFormat
 * @type RegionalDateFormat
 *
 * @description
 * Date-pattern vocabulary understood by {@link OrgDatePipe}. Deliberately
 * domain-agnostic — it names a formatting pattern, not an organization
 * preference — even though its members today mirror the values a
 * `dateFormat` regional setting can hold.
 *
 * @since 1.0.0
 */
export type RegionalDateFormat =
  | 'dd/MM/yyyy'
  | 'MM/dd/yyyy'
  | 'yyyy-MM-dd'
  | 'dd.MM.yyyy'
  | 'dd-MM-yyyy';

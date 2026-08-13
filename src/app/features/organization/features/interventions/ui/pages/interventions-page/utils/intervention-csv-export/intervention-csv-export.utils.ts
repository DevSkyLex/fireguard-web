import type {
  InterventionOutput,
  InterventionPriority,
  InterventionStatus,
  InterventionType,
} from '@features/organization/features/interventions/models';
import {
  INTERVENTION_TABLE_COLUMN,
  type InterventionTableColumn,
} from '../../../../tables/intervention-table';

/**
 * The byte-order mark CSV needs prepended so Excel opens a UTF-8 file with
 * accented characters intact instead of guessing a legacy codepage.
 */
const UTF8_BOM = '﻿';

/**
 * RFC 4180 line ending.
 */
const CSV_LINE_ENDING = '\r\n';

/**
 * Function escapeCsvField
 *
 * @description
 * Quotes a field per RFC 4180 when it carries the separator, a quote or a
 * line break, doubling any quote it contains. Left bare otherwise, so a
 * plain reference or name stays readable unquoted.
 *
 * @param {string} value - The raw field value.
 *
 * @returns {string} The field as it should appear on the CSV line.
 *
 * @since 1.0.0
 */
export function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Function resolveInterventionCsvField
 *
 * @description
 * Resolves one hideable column's display value for one row, matching how
 * {@link InterventionTable} renders the same column: tag labels for the
 * enum columns, the site display map for the site, and an ISO date —
 * spreadsheet-safe and unambiguous across locales — for the due date rather
 * than the table's locale-formatted `mediumDate`.
 *
 * @param {InterventionTableColumn} column - The column being resolved.
 * @param {InterventionOutput} intervention - The row it is resolved for.
 * @param {{
 *   readonly statusLabelOf: (value: InterventionStatus) => string;
 *   readonly typeLabelOf: (value: InterventionType) => string;
 *   readonly priorityLabelOf: (value: InterventionPriority) => string;
 *   readonly siteLabelOf: (value: string) => string;
 * }} labels - The page's own label resolvers, reused so the CSV never
 * introduces a second translation for the same value.
 *
 * @returns {string} The cell's display value, empty when the row has none.
 *
 * @since 1.0.0
 */
function resolveInterventionCsvField(
  column: InterventionTableColumn,
  intervention: InterventionOutput,
  labels: {
    readonly statusLabelOf: (value: InterventionStatus) => string;
    readonly typeLabelOf: (value: InterventionType) => string;
    readonly priorityLabelOf: (value: InterventionPriority) => string;
    readonly siteLabelOf: (value: string) => string;
  },
): string {
  switch (column) {
    case INTERVENTION_TABLE_COLUMN.STATUS:
      return labels.statusLabelOf(intervention.status);
    case INTERVENTION_TABLE_COLUMN.PRIORITY:
      return labels.priorityLabelOf(intervention.priority);
    case INTERVENTION_TABLE_COLUMN.TYPE:
      return labels.typeLabelOf(intervention.type);
    case INTERVENTION_TABLE_COLUMN.SITE:
      return intervention.site ? labels.siteLabelOf(intervention.site) : '';
    case INTERVENTION_TABLE_COLUMN.DUE:
      return intervention.dueAt ? intervention.dueAt.slice(0, 10) : '';
  }
}

/**
 * Function buildInterventionCsv
 *
 * @description
 * Serializes intervention rows into an RFC 4180 CSV: quoted/escaped fields,
 * CRLF line endings and a leading UTF-8 BOM. Columns mirror exactly what
 * {@link InterventionTable} currently shows — the reference and the name are
 * always present, the rest follow `visibleColumns`, in the table's own
 * order — so the export is never wider or narrower than the screen.
 *
 * @param {readonly InterventionOutput[]} rows - The rows to serialize, already scoped
 * to the current filters and sort.
 * @param {ReadonlyArray<InterventionTableColumn>} visibleColumns - The optional columns
 * currently shown, in display order.
 * @param {{
 *   readonly columnLabelOf: (column: InterventionTableColumn) => string;
 *   readonly statusLabelOf: (value: InterventionStatus) => string;
 *   readonly typeLabelOf: (value: InterventionType) => string;
 *   readonly priorityLabelOf: (value: InterventionPriority) => string;
 *   readonly siteLabelOf: (value: string) => string;
 * }} labels - The page's own header and value resolvers.
 *
 * @returns {string} The complete CSV document, BOM included.
 *
 * @since 1.0.0
 */
export function buildInterventionCsv(
  rows: readonly InterventionOutput[],
  visibleColumns: ReadonlyArray<InterventionTableColumn>,
  labels: {
    readonly columnLabelOf: (column: InterventionTableColumn) => string;
    readonly statusLabelOf: (value: InterventionStatus) => string;
    readonly typeLabelOf: (value: InterventionType) => string;
    readonly priorityLabelOf: (value: InterventionPriority) => string;
    readonly siteLabelOf: (value: string) => string;
  },
): string {
  const referenceHeader: string = $localize`:@@intervention.list.columnReference:Ref.`;
  const nameHeader: string = $localize`:@@intervention.list.columnIntervention:Intervention`;

  const headerRow: readonly string[] = [
    referenceHeader,
    nameHeader,
    ...visibleColumns.map((column: InterventionTableColumn): string =>
      labels.columnLabelOf(column),
    ),
  ];

  const dataRows: readonly (readonly string[])[] = rows.map(
    (intervention: InterventionOutput): readonly string[] => [
      `FG-${intervention.number}`,
      intervention.name,
      ...visibleColumns.map((column: InterventionTableColumn): string =>
        resolveInterventionCsvField(column, intervention, labels),
      ),
    ],
  );

  const body: string = [headerRow, ...dataRows]
    .map((fields: readonly string[]): string => fields.map(escapeCsvField).join(','))
    .join(CSV_LINE_ENDING);

  return `${UTF8_BOM}${body}${CSV_LINE_ENDING}`;
}

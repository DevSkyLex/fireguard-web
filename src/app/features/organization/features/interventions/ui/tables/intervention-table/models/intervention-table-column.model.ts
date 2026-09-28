/**
 * Constant INTERVENTION_TABLE_COLUMN
 *
 * @description
 * The optional columns an operator can hide, keyed by the id the visibility
 * menu and the template both use.
 *
 * The reference, the name and the row menu are absent on purpose: a row
 * without them is not a row.
 *
 * @since 3.0.0
 */
export const INTERVENTION_TABLE_COLUMN = {
  STATUS: 'status',
  PRIORITY: 'priority',
  TYPE: 'type',
  SITE: 'site',
  RESPONSIBLE: 'responsible',
  PARTICIPANTS: 'participants',
  DUE: 'due',
  START: 'start',
  UPDATED: 'updated',
} as const;

/**
 * Type InterventionTableColumn
 *
 * @description
 * One hideable column id.
 *
 * @since 3.0.0
 */
export type InterventionTableColumn =
  (typeof INTERVENTION_TABLE_COLUMN)[keyof typeof INTERVENTION_TABLE_COLUMN];

/**
 * Constant INTERVENTION_TABLE_COLUMNS
 *
 * @description
 * Every hideable column, in the order the menu lists them.
 *
 * @since 3.0.0
 *
 * @type {ReadonlyArray<InterventionTableColumn>}
 */
export const INTERVENTION_TABLE_COLUMNS: ReadonlyArray<InterventionTableColumn> = [
  INTERVENTION_TABLE_COLUMN.STATUS,
  INTERVENTION_TABLE_COLUMN.PRIORITY,
  INTERVENTION_TABLE_COLUMN.TYPE,
  INTERVENTION_TABLE_COLUMN.SITE,
  INTERVENTION_TABLE_COLUMN.RESPONSIBLE,
  INTERVENTION_TABLE_COLUMN.PARTICIPANTS,
  INTERVENTION_TABLE_COLUMN.START,
  INTERVENTION_TABLE_COLUMN.DUE,
  INTERVENTION_TABLE_COLUMN.UPDATED,
];

/**
 * Constant INTERVENTION_TABLE_DEFAULT_HIDDEN_COLUMNS
 *
 * @description
 * Columns hidden the first time an operator opens the list, before any
 * preference cookie exists. Start and Updated echo the sortable fields the
 * list can order by but otherwise never surfaces a date for.
 *
 * @since 6.4.0
 *
 * @type {ReadonlyArray<InterventionTableColumn>}
 */
export const INTERVENTION_TABLE_DEFAULT_HIDDEN_COLUMNS: ReadonlyArray<InterventionTableColumn> = [
  INTERVENTION_TABLE_COLUMN.START,
  INTERVENTION_TABLE_COLUMN.UPDATED,
];

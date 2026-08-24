import type { InterventionRecurrenceOutput } from './intervention-recurrence-output.interface';

/**
 * Type InterventionRecurrenceFormTarget
 * @type InterventionRecurrenceFormTarget
 *
 * @description
 * What a recurrence form is editing: a brand-new draft (`'create'`), an
 * existing rule being edited, or nothing (`null`, form closed).
 */
export type InterventionRecurrenceFormTarget = 'create' | InterventionRecurrenceOutput | null;

import type { ImportJobKind } from '@features/organization/features/imports/models';

/**
 * Constant IMPORT_JOB_KIND_OPTIONS
 * @const IMPORT_JOB_KIND_OPTIONS
 *
 * @description
 * The collections a CSV upload can target, offered by the upload form's
 * kind select.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: ImportJobKind }>}
 */
export const IMPORT_JOB_KIND_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: ImportJobKind;
}> = [
  { label: $localize`:@@imports.kind.equipment:Equipment`, value: 'equipment' },
  { label: $localize`:@@imports.kind.facility:Facilities`, value: 'facility' },
  { label: $localize`:@@imports.kind.member:Members`, value: 'member' },
];

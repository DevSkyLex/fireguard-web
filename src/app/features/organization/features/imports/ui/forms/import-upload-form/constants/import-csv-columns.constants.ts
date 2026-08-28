import type { ImportJobKind } from '@features/organization/features/imports/models';

/**
 * Interface ImportCsvColumnHelp
 * @description One kind's CSV column contract, for the upload form's help block.
 */
export interface ImportCsvColumnHelp {
  /** Column names the file must carry. @type {ReadonlyArray<string>} */
  readonly required: ReadonlyArray<string>;
  /** Column names the file may carry. @type {ReadonlyArray<string>} */
  readonly optional: ReadonlyArray<string>;
  /** Kind-specific caveats beyond the plain required/optional split. @type {ReadonlyArray<string>} */
  readonly notes: ReadonlyArray<string>;
}

/**
 * Constant IMPORT_CSV_COLUMN_HELP
 * @const IMPORT_CSV_COLUMN_HELP
 *
 * @description
 * The CSV column contract for each `ImportJobKind`, hard-coded because no
 * template endpoint exists on the backend — verified against the Import
 * module's parser. `latitude`/`longitude` on `facility` must be given
 * together; `parentCode` must reference a pre-existing facility on a real
 * run (parents must precede children in the file) but a dry run also
 * resolves it against earlier `would_create` rows in the same file.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<ImportJobKind, ImportCsvColumnHelp>>}
 */
export const IMPORT_CSV_COLUMN_HELP: Readonly<Record<ImportJobKind, ImportCsvColumnHelp>> = {
  equipment: {
    required: ['type'],
    optional: ['subType', 'brand', 'model', 'serialNumber', 'locationLabel', 'facilityCode'],
    notes: [
      $localize`:@@imports.csvHelp.equipment.facilityCode:facilityCode assigns the created item to the facility carrying that code — an unknown code fails the row.`,
    ],
  },
  facility: {
    required: ['type', 'name'],
    optional: ['code', 'address', 'latitude', 'longitude', 'parentCode'],
    notes: [
      $localize`:@@imports.csvHelp.facility.coordinates:latitude and longitude must be given together.`,
      $localize`:@@imports.csvHelp.facility.parentCode:parentCode must reference a facility that already exists — order parent rows before their children. A dry run also resolves it against earlier "would create" rows in the same file.`,
    ],
  },
  member: {
    required: ['email'],
    optional: ['roles'],
    notes: [
      $localize`:@@imports.csvHelp.member.roles:roles takes organization role names separated by |. Leave it blank to grant the default member role.`,
    ],
  },
};

/**
 * Constant IMPORT_CSV_GENERAL_NOTES
 * @const IMPORT_CSV_GENERAL_NOTES
 *
 * @description
 * File-level rules that apply regardless of {@link ImportJobKind}.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<string>}
 */
export const IMPORT_CSV_GENERAL_NOTES: ReadonlyArray<string> = [
  $localize`:@@imports.csvHelp.general.delimiter:Comma or semicolon delimited, UTF-8 (a leading BOM is fine).`,
  $localize`:@@imports.csvHelp.general.unknownColumns:Unknown columns are ignored.`,
  $localize`:@@imports.csvHelp.general.limits:Up to 5,000 rows and 5 MB per file.`,
];

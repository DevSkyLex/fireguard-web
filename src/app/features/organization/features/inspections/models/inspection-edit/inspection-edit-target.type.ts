/**
 * Type InspectionEditTarget
 *
 * @description
 * The inspection properties `UpdateInspectionInput` exposes as editable on
 * the record, each edited where it is displayed (`ARCHITECTURE.md` §10.5).
 * `equipmentId`, `facilityId` and `checklistId` are accepted by the same
 * input but render read-only in `InspectionInformationPanel`
 * (`FEATURE.md` "Equipment, facility and checklist stay read-only in the
 * panel"), so they are not edit targets here.
 *
 * @since 1.0.0
 */
export type InspectionEditTarget = 'result' | 'performedAt' | 'notes' | 'signature';

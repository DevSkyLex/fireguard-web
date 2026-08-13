/**
 * The two attachment kinds the backend distinguishes: a plain evidence
 * `file`, or the typed completion `signature` captured once per intervention
 * at submission time (Phase 5d.2). Mirrors
 * `InterventionAttachmentKind` byte for byte.
 */
export type InterventionAttachmentKind = 'file' | 'signature';

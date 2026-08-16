/**
 * Type FacilityAttachmentKind
 *
 * @description
 * The two attachment kinds the backend distinguishes: a plain `document`
 * (the default), or a `floor_plan` — an image the backend probes for
 * `imageWidth`/`imageHeight` at upload time. Mirrors the backend's
 * `FacilityAttachmentKind` byte for byte.
 *
 * @since 1.0.0
 */
export type FacilityAttachmentKind = 'document' | 'floor_plan';

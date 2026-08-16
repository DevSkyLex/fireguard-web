import type { HydraItem } from '@core/api/models';
import type { FacilityAttachmentKind } from './facility-attachment-kind.type';

/**
 * Interface FacilityAttachmentOutput
 * @interface FacilityAttachmentOutput
 *
 * @description
 * One file attached to a facility, mirroring the backend's
 * `FacilityAttachmentOutput`. A `floor_plan` carries `imageWidth`/
 * `imageHeight` when the backend could probe them (null for an SVG or a
 * probe failure); a `document` never does. At most one `floor_plan` per
 * facility has `isPrimaryPlan: true`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityAttachmentOutput extends HydraItem {
  //#region Properties
  /** Attachment identifier. */
  readonly id: string;

  /** Owning facility id. */
  readonly facilityId: string;

  /** Stored file name. */
  readonly fileName: string;

  /** Declared MIME type. */
  readonly mimeType: string;

  /** Size in bytes. */
  readonly size: number;

  /** Absolute, cookie-authenticated URL serving the file's binary content — usable directly as an `<img src>`. */
  readonly url: string;

  /** `document` (default) or `floor_plan`. */
  readonly kind: FacilityAttachmentKind;

  /** Whether this is the facility's primary floor plan; always `false` for a `document`. */
  readonly isPrimaryPlan: boolean;

  /** The image's pixel width, probed server-side for a `floor_plan`; null when unknown or not applicable. */
  readonly imageWidth: number | null;

  /** The image's pixel height, probed server-side for a `floor_plan`; null when unknown or not applicable. */
  readonly imageHeight: number | null;

  /** Optimistic-concurrency revision (`If-Match: "revision-N"`). */
  readonly revision: number;

  /** ISO upload instant. */
  readonly uploadedAt: string;
  //#endregion
}

import type { HydraItem } from '@core/api/models';
import type { FacilityCalibrationIssue } from '../facility-spatial-issue-tag/facility-spatial-issue.type';
import type { FacilityAttachmentKind } from './facility-attachment-kind.type';
import type { FacilityPlanCalibration } from './facility-plan-calibration.interface';

/**
 * Interface FacilityAttachmentOutput
 * @interface FacilityAttachmentOutput
 *
 * @description
 * One file attached to a facility, mirroring the backend's
 * `FacilityAttachmentOutput`. A `floor_plan` carries `imageWidth`/
 * `imageHeight` when the backend could probe them (null for an SVG or a
 * probe failure); a `document` never does. At most one `floor_plan` per
 * facility has `isPrimaryPlan: true`. Carries no download URL of its own —
 * the bearer-authenticated `GET /api/facility-attachments/{id}/download`
 * route (`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`)
 * is read through `FacilityAttachmentService.download`, mirroring
 * `InterventionAttachmentOutput`.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityAttachmentOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   *
   * @description
   * Attachment identifier.
   */
  readonly id: string;

  /**
   * Property facilityId
   *
   * @description
   * Owning facility id.
   */
  readonly facilityId: string;

  /**
   * Property fileName
   *
   * @description
   * Stored file name.
   */
  readonly fileName: string;

  /**
   * Property mimeType
   *
   * @description
   * Declared MIME type.
   */
  readonly mimeType: string;

  /**
   * Property size
   *
   * @description
   * Size in bytes.
   */
  readonly size: number;

  /**
   * Property kind
   *
   * @description
   * `document` (default) or `floor_plan`.
   */
  readonly kind: FacilityAttachmentKind;

  /**
   * Property isPrimaryPlan
   *
   * @description
   * Whether this is the facility's primary floor plan; always `false` for a `document`.
   */
  readonly isPrimaryPlan: boolean;

  /**
   * Property imageWidth
   *
   * @description
   * The image's pixel width, probed server-side for a `floor_plan`; null when unknown or not
   * applicable.
   */
  readonly imageWidth: number | null;

  /**
   * Property imageHeight
   *
   * @description
   * The image's pixel height, probed server-side for a `floor_plan`; null when unknown or not
   * applicable.
   */
  readonly imageHeight: number | null;

  /**
   * Property revision
   *
   * @description
   * Optimistic-concurrency revision (`If-Match: "revision-N"`).
   */
  readonly revision: number;

  /**
   * Property calibration
   *
   * @description
   * Optional metric calibration of this immutable image.
   */
  readonly calibration?: FacilityPlanCalibration | null;

  /**
   * Property calibrationBuildingId
   *
   * @description
   * Building reference confirmed when the calibration was saved.
   */
  readonly calibrationBuildingId?: string | null;

  /**
   * Property calibrationIssue
   *
   * @description
   * Reason why the retained calibration cannot currently be used in this building.
   */
  readonly calibrationIssue?: FacilityCalibrationIssue | null;

  /**
   * Property uploadedAt
   *
   * @description
   * ISO upload instant.
   */
  readonly uploadedAt: string;
  //#endregion
}

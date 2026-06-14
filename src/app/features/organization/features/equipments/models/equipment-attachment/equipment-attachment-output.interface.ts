import type { HydraItem } from '@core/models/api';

/**
 * Interface EquipmentAttachmentOutput
 * @interface EquipmentAttachmentOutput
 *
 * @description
 * Attachment resource linked to one equipment.
 */
export interface EquipmentAttachmentOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the attachment.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Persisted revision used for conditional requests.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Identifier of the equipment owning the attachment.
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Original file name of the attachment.
   *
   * @type {string}
   */
  readonly fileName: string;

  /**
   * Property mimeType
   * @readonly
   *
   * @description
   * MIME type of the uploaded file.
   *
   * @type {string}
   */
  readonly mimeType: string;

  /**
   * Property size
   * @readonly
   *
   * @description
   * File size in bytes.
   *
   * @type {number}
   */
  readonly size: number;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional label displayed for the attachment.
   *
   * @type {string | null}
   */
  readonly label: string | null;

  /**
   * Property uploadedAt
   * @readonly
   *
   * @description
   * Upload timestamp of the attachment.
   *
   * @type {string}
   */
  readonly uploadedAt: string;
  //#endregion
}

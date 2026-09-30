/**
 * Interface InterventionPhotoAttachment
 * @interface InterventionPhotoAttachment
 *
 * @description
 * Describes a photo attached to intervention work or equipment.
 */
export interface InterventionPhotoAttachment {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Identifies the equipment associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property file
   * @readonly
   *
   * @description
   * Contains the selected file being uploaded.
   *
   * @access public
   *
   * @type {File}
   */
  readonly file: File;
}

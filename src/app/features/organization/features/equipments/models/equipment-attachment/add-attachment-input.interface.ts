/**
 * Interface AddAttachmentInput
 * @interface AddAttachmentInput
 *
 * @description
 * Payload used to attach a file to an equipment.
 */
export interface AddAttachmentInput {
  //#region Properties
  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Original file name of the uploaded attachment.
   *
   * @type {string}
   */
  readonly fileName: string;

  /**
   * Property content
   * @readonly
   *
   * @description
   * Encoded file content sent to the API.
   *
   * @type {string}
   */
  readonly content: string;

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
   * Property label
   * @readonly
   *
   * @description
   * Optional label associated with the attachment.
   *
   * @type {string | null}
   */
  readonly label?: string | null;
  //#endregion
}

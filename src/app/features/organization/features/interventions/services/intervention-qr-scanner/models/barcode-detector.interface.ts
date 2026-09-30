/**
 * Interface DetectedBarcode
 * @interface DetectedBarcode
 *
 * @description
 * Minimal shape of a barcode detection result returned by the browser
 * `BarcodeDetector` API.
 */
export interface DetectedBarcode {
  //#region Properties
  /**
   * Property rawValue
   * @readonly
   *
   * @description
   * Raw decoded barcode content.
   *
   * @access public
   *
   * @type {string}
   */
  readonly rawValue: string;
  //#endregion
}

/**
 * Interface BarcodeDetectorInstance
 * @interface BarcodeDetectorInstance
 *
 * @description
 * Minimal `BarcodeDetector` instance contract used for QR code scanning.
 */
export interface BarcodeDetectorInstance {
  /**
   * Method detect
   * @method detect
   *
   * @description
   * Detects supported barcodes in the supplied image source.
   *
   * @access public
   *
   * @param {ImageBitmapSource} source - Image source to scan for supported barcodes.
   *
   * @returns {Promise<readonly DetectedBarcode[]>} Detected barcodes from the supplied image
   *   source.
   */
  detect(source: ImageBitmapSource): Promise<readonly DetectedBarcode[]>;
}

/**
 * Type BarcodeDetectorConstructor
 *
 * @description
 * Constructor signature of the experimental `BarcodeDetector` browser API,
 * typed locally because it is not part of the standard DOM lib yet.
 *
 * @type BarcodeDetectorConstructor
 */
export type BarcodeDetectorConstructor = new (options?: {
  formats?: readonly string[];
}) => BarcodeDetectorInstance;

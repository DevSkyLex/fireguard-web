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
  detect(source: ImageBitmapSource): Promise<readonly DetectedBarcode[]>;
}

/**
 * Interface BarcodeDetectorConstructor
 * @interface BarcodeDetectorConstructor
 *
 * @description
 * Constructor signature of the experimental `BarcodeDetector` browser API,
 * typed locally because it is not part of the standard DOM lib yet.
 */
export interface BarcodeDetectorConstructor {
  new (options?: { formats?: readonly string[] }): BarcodeDetectorInstance;
}

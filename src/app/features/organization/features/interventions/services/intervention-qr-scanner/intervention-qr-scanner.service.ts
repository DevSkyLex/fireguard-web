import { Injectable } from '@angular/core';
import type { BarcodeDetectorConstructor } from './models';

/**
 * Service MissionQrScannerService
 * @class MissionQrScannerService
 *
 * @description
 * Browser QR code decoding service used by mission equipment entry.
 *
 * Wraps the experimental `BarcodeDetector` API so UI components only deal
 * with a simple "decode this photo" contract and can degrade gracefully when
 * the browser lacks support.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionQrScannerService {
  //#region Methods
  /**
   * Method isSupported
   * @method isSupported
   *
   * @description
   * Whether the current browser exposes the `BarcodeDetector` API.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {boolean} `true` when QR decoding is available.
   */
  public isSupported(): boolean {
    return this.detector() !== undefined;
  }

  /**
   * Method scan
   * @method scan
   *
   * @description
   * Decodes the first QR code found in a captured photo.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {File} file - Captured photo to decode.
   *
   * @return {Promise<string | null>} A promise resolving with the trimmed QR value, or `null` when none is detected.
   */
  public async scan(file: File): Promise<string | null> {
    const Detector = this.detector();
    if (!Detector) {
      return null;
    }

    const image = await createImageBitmap(file);
    try {
      const results = await new Detector({
        formats: ['qr_code'],
      }).detect(image);

      return results[0]?.rawValue.trim() || null;
    } finally {
      image.close();
    }
  }

  /**
   * Method detector
   * @method detector
   *
   * @description
   * Returns the `BarcodeDetector` constructor when the browser provides it.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {BarcodeDetectorConstructor | undefined} Constructor, or `undefined` when unsupported.
   */
  private detector(): BarcodeDetectorConstructor | undefined {
    return (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  }
  //#endregion
}

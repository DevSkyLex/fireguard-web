import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

/**
 * Constant PHOTO_MAX_DIMENSION
 * @const PHOTO_MAX_DIMENSION
 *
 * @description
 * Longest edge in pixels allowed for uploaded evidence photos.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PHOTO_MAX_DIMENSION = 1_600;

/**
 * Constant PHOTO_JPEG_QUALITY
 * @const PHOTO_JPEG_QUALITY
 *
 * @description
 * JPEG quality used when compressing evidence photos.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PHOTO_JPEG_QUALITY = 0.82;

/**
 * Service MissionPhotoCompressorService
 * @class MissionPhotoCompressorService
 *
 * @description
 * Browser-only image compression service for mission evidence photos.
 *
 * Downscales and re-encodes captured photos to JPEG so offline storage and
 * uploads stay lightweight on field connections.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionPhotoCompressorService {
  //#region Properties
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the service runs in a browser platform with canvas access.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  //#endregion

  //#region Methods
  /**
   * Method compress
   * @method compress
   *
   * @description
   * Downscales and re-encodes a photo to JPEG. Returns the original file
   * when compression is unavailable (server platform, non-image file or
   * missing canvas context).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {File} file - Original captured photo.
   *
   * @return {Promise<File>} A promise resolving with the compressed JPEG file, or the original file.
   */
  public async compress(file: File): Promise<File> {
    if (!this.browser || !file.type.startsWith('image/')) {
      return file;
    }

    const image = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext('2d');
    if (!context) {
      image.close();
      return file;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    const blob = await new Promise(
      (
        resolve: (value: Blob | PromiseLike<Blob>) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Image compression failed'))),
          'image/jpeg',
          PHOTO_JPEG_QUALITY,
        );
      },
    );
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  }
  //#endregion
}

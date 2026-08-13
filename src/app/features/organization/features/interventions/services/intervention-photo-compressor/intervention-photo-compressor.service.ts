import { isPlatformBrowser } from '@angular/common';
import { inject, Service, PLATFORM_ID } from '@angular/core';
import { PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION } from './constants';

/**
 * Service InterventionPhotoCompressorService
 * @class InterventionPhotoCompressorService
 *
 * @description
 * Browser-only image compression service for intervention evidence photos.
 *
 * Downscales and re-encodes captured photos to JPEG so offline storage and
 * uploads stay lightweight on field connections.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionPhotoCompressorService {
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

  /**
   * Method prepareAll
   * @method prepareAll
   *
   * @description
   * Compresses every picked file, collecting the ones that compressed
   * successfully separately from the names of the ones that did not — a
   * caller uploads the former and reports the latter, without either outcome
   * blocking the other.
   *
   * @access public
   * @since 4.6.0
   *
   * @param {readonly File[]} files - The picked files.
   *
   * @return {Promise<{ ready: File[]; failed: string[] }>} The compressed files and the names that failed.
   */
  public async prepareAll(files: readonly File[]): Promise<{ ready: File[]; failed: string[] }> {
    const settled: readonly PromiseSettledResult<File>[] = await Promise.allSettled(
      files.map((file: File): Promise<File> => this.compress(file)),
    );

    const ready: File[] = [];
    const failed: string[] = [];
    settled.forEach((outcome: PromiseSettledResult<File>, index: number): void => {
      if (outcome.status === 'fulfilled') ready.push(outcome.value);
      else failed.push(files[index].name);
    });

    return { ready, failed };
  }
  //#endregion
}

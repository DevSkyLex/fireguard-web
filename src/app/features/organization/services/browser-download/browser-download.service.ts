import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';

/**
 * Service BrowserDownloadService
 * @class BrowserDownloadService
 *
 * @description
 * Saves a `Blob` to the visitor's device through a throwaway object URL and
 * anchor click — the mechanism `<a download>` needs when the file came from
 * an authenticated fetch rather than a plain link. Backs the estate
 * explorer's compliance "Export safety register" button. Mirrors
 * `features/interventions/services/browser-download` (`ARCHITECTURE.md`
 * §2.9): the two are not lifted to a shared location yet, since only two
 * consumers exist and each is a single small class. A no-op outside the
 * browser platform.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class BrowserDownloadService {
  //#region Properties
  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the service runs in a browser platform with `document` access.
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
   * Method trigger
   * @method trigger
   *
   * @description
   * Saves `blob` under `fileName` by clicking a throwaway anchor, then
   * revokes the object URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {Blob} blob - The binary content to save.
   * @param {string} fileName - The suggested file name.
   *
   * @returns {void}
   */
  public trigger(blob: Blob, fileName: string): void {
    if (!this.browser) return;

    const url: string = URL.createObjectURL(blob);
    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  //#endregion
}

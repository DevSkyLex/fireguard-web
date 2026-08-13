import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';

/**
 * Service BrowserDownloadService
 * @class BrowserDownloadService
 *
 * @description
 * Saves a `Blob` to the visitor's device through a throwaway object URL and
 * anchor click — the mechanism `<a download>` needs when the file came from
 * an authenticated fetch rather than a plain link. Shared by the
 * interventions list's CSV export and the detail page's attachment
 * download, the two consumers that justify lifting this out of
 * `InterventionsPage` (`ARCHITECTURE.md` §2.8). A no-op outside the browser
 * platform.
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

import { inject, Injectable } from '@angular/core';
import { TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { TitleService } from '@core/title';

/**
 * Strategy PageTitleStrategy
 * @class PageTitleStrategy
 *
 * @description
 * Custom TitleStrategy that uses the TitleService to format
 * and set page titles based on route configuration.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  //#region Properties
  /**
   * Property titleService
   * @readonly
   *
   * @description
   * Title service of the application.
   *
   * @since 1.0.0
   *
   * @type {TitleService}
   */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);
  //#endregion

  //#region Methods
  /**
   * Method updateTitle
   * @override
   *
   * @description
   * Updates the page title using the TitleService.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RouterStateSnapshot} routerState - The current router state snapshot
   *
   * @returns {void} - Returns nothing
   */
  public override updateTitle(routerState: RouterStateSnapshot): void {
    // Build title from route data
    const title: string | undefined = this.buildTitle(routerState);

    // Set title using TitleService
    this.titleService.setTitle(title ?? '');
  }
  //#endregion
}

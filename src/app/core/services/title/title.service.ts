import { Injectable, inject, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * TitleService
 * @class TitleService
 *
 * @description
 * Service responsible for managing the application title using signals.
 * Provides reactive state for page titles with a consistent suffix
 * configured via environment.
 *
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * const titleService: TitleService = inject<TitleService>(TitleService);
 * titleService.setTitle('Home');
 * ```
 * 
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class TitleService {
  //#region Properties
  /**
   * Property title
   * @readonly
   * 
   * @description
   * Title service of the application.
   * 
   * @access private
   * @since 1.0.0
   * 
   * @type {Title}
   */
  private readonly title: Title = 
    inject<Title>(Title);

  /**
   * Property env
   * @readonly
   * 
   * @description
   * Environment configuration of the application.
   * 
   * @access private
   * @since 1.0.0
   * 
   * @type {EnvironmentConfig}
   */
  private readonly env: EnvironmentConfig = 
    inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Property separator
   * @readonly
   * 
   * @description
   * Separator used to separate the page title 
   * from the application name.
   * 
   * @access private
   * @since 1.0.0
   * 
   * @type {string}
   */
  private readonly separator: string = "|";

  /**
   * Property pageTitle
   * @readonly
   * 
   * @description
   * Page title of the application.
   * 
   * @access public
   * @since 1.0.0
   * 
   * @type {WritableSignal<string>}
   */
  public readonly pageTitle: WritableSignal<string> = 
    signal<string>('');

  /**
   * Property fullTitle
   * @readonly
   * 
   * @description
   * Full title of the application.
   * 
   * @access public
   * @since 1.0.0
   * 
   * @type {Signal<string>}
   */
  public readonly fullTitle: Signal<string> = computed<string>(() =>
    this.pageTitle() ? `${this.pageTitle()} ${this.separator} ${this.env.appName}` : this.env.appName
  );
  //#endregion

  //#region Methods
  /**
   * Method setTitle
   * 
   * @description
   * Sets the page title with the application 
   * name suffix.
   * 
   * @access public
   * @since 1.0.0
   * 
   * @param {string} pageTitle - The specific page title
   * 
   * @returns {void} - Returns nothing
   */
  public setTitle(pageTitle: string): void {
    this.pageTitle.set(pageTitle);
    this.title.setTitle(this.fullTitle());
  }

  /**
   * Method getTitle
   * 
   * @description
   * Gets the current page title 
   * from the browser.
   * 
   * @access public
   * @since 1.0.0
   * 
   * @returns {string} - The current browser title
   */
  public getTitle(): string {
    return this.title.getTitle();
  }
  //#endregion
}

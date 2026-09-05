import { Service, signal, type Signal, type TemplateRef, type WritableSignal } from '@angular/core';

/**
 * Service PageTabsService
 * @class PageTabsService
 *
 * @description
 * Lets the currently activated page contribute its primary content tabs to
 * the dashboard page header. Templates retain the declaring page's injector
 * and reactive context, so feature-owned Spartan tab triggers can control
 * their own panels while the shell owns only their placement.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class PageTabsService {
  //#region State
  /**
   * Property tabsState
   * @readonly
   *
   * @description
   * Backing signal for the page tab template currently owned by an active page.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<TemplateRef<unknown> | null>}
   */
  private readonly tabsState: WritableSignal<TemplateRef<unknown> | null> =
    signal<TemplateRef<unknown> | null>(null);

  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Read-only page tab template rendered by the dashboard page header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  public readonly tabs: Signal<TemplateRef<unknown> | null> = this.tabsState.asReadonly();
  //#endregion

  //#region Public Methods
  /**
   * Method register
   * @method register
   *
   * @description
   * Registers the active page's primary content tab template; the latest page wins.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} template - Feature-owned tabs rendered in the page header.
   * @returns {void}
   */
  public register(template: TemplateRef<unknown>): void {
    this.tabsState.set(template);
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Clears the tabs unconditionally, or only when the supplied template still owns the slot.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} [template] - Template whose ownership is being released.
   * @returns {void}
   */
  public clear(template?: TemplateRef<unknown>): void {
    if (template !== undefined && this.tabsState() !== template) return;

    this.tabsState.set(null);
  }
  //#endregion
}

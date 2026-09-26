import {
  Injectable,
  signal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';

/**
 * Interface DashboardPagePanel
 * @interface DashboardPagePanel
 *
 * @description Page-owned template and accessible name currently claiming the right slot.
 * @since 1.0.0
 */
export interface DashboardPagePanel {
  /** Template rendered with its declaring page's signals and injector. */
  readonly template: TemplateRef<unknown>;
  /** Localized accessible name for its complementary region. */
  readonly label: string;
}

/**
 * Service DashboardPanelRegistry
 * @class DashboardPanelRegistry
 *
 * @description Transfers a page-declared template to the dashboard slot without moving its injector or state.
 * @since 1.0.0
 */
@Injectable()
export class DashboardPanelRegistry {
  /**
   * Property panelState
   * @readonly
   * @description The current page registration, cleared only by the template that owns it.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<DashboardPagePanel | null>}
   */
  private readonly panelState: WritableSignal<DashboardPagePanel | null> =
    signal<DashboardPagePanel | null>(null);

  /**
   * Property panel
   * @readonly
   * @description Read-only registration consumed by the shell's page-panel contribution.
   * @access public
   * @since 1.0.0
   * @type {Signal<DashboardPagePanel | null>}
   */
  public readonly panel: Signal<DashboardPagePanel | null> = this.panelState.asReadonly();

  /**
   * Method register
   * @method register
   * @description Registers a page template and its localized complementary-region name.
   * @access public
   * @since 1.0.0
   * @param {TemplateRef<unknown>} template - Page-owned template.
   * @param {string} label - Localized region name.
   * @returns {void}
   */
  public register(template: TemplateRef<unknown>, label: string): void {
    this.panelState.set({ template, label });
  }

  /**
   * Method clear
   * @method clear
   * @description Releases only the template that still owns the slot.
   * @access public
   * @since 1.0.0
   * @param {TemplateRef<unknown>} template - Owner asking to release its registration.
   * @returns {void}
   */
  public clear(template: TemplateRef<unknown>): void {
    if (this.panelState()?.template === template) this.panelState.set(null);
  }
}

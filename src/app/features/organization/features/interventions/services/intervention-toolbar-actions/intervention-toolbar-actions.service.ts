import { Service, signal, type Signal, type TemplateRef, type WritableSignal } from '@angular/core';

/**
 * Service InterventionToolbarActions
 * @class InterventionToolbarActions
 *
 * @description
 * The slot through which an intervention view contributes its own controls to
 * the shell's toolbar, so the trio renders one toolbar row rather than two
 * stacked ones.
 *
 * `InterventionsShellPage` owns the toolbar, but the List's extra controls —
 * Display, Recurrences, Export, bulk actions — read the list's sort order,
 * column set, recurrence store and row selection. Moving them into the shell
 * would drag all of that up with them and break the boundary the shell was
 * extracted to draw: the shell writes the URL and knows nothing of a leaf's
 * state. Instead the leaf registers a `TemplateRef` here and the shell renders
 * it, exactly as `PageActionsService` (`@core/page-actions`) already lets a
 * page contribute buttons to the shell header.
 *
 * Provided on the interventions routes rather than in `core`: one feature
 * consumes it, and a second would be needed before this shape earns a place
 * beside `PageActionsService` (`ARCHITECTURE.md` §2.8, §2.9).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionToolbarActions {
  //#region State
  /**
   * Property actionsState
   * @readonly
   * @description The currently registered template, or `null` when the active view contributes none.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<TemplateRef<unknown> | null>}
   */
  private readonly actionsState: WritableSignal<TemplateRef<unknown> | null> =
    signal<TemplateRef<unknown> | null>(null);

  /**
   * Property actions
   * @readonly
   * @description What the shell's toolbar renders for the active view — `null` on a view that contributes nothing.
   * @access public
   * @since 1.0.0
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  public readonly actions: Signal<TemplateRef<unknown> | null> = this.actionsState.asReadonly();
  //#endregion

  //#region Methods
  /**
   * Method register
   * @method register
   *
   * @description
   * Publishes a view's toolbar controls. Last registration wins, so a view
   * re-registering after a template swap simply replaces its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} template - Template rendered inside the shell's toolbar.
   *
   * @returns {void}
   */
  public register(template: TemplateRef<unknown>): void {
    this.actionsState.set(template);
  }

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Withdraws a view's controls. Called with a template, it clears only when
   * that template is still the registered one — a leaf destroyed after its
   * successor has already registered must not blank the successor's slot,
   * which is exactly what happens when switching between the three views.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} [template] - Template to withdraw, when clearing only on ownership match.
   *
   * @returns {void}
   */
  public clear(template?: TemplateRef<unknown>): void {
    if (template !== undefined && this.actionsState() !== template) return;

    this.actionsState.set(null);
  }
  //#endregion
}

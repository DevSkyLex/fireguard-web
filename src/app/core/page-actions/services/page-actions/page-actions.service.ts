import { Service, signal, type Signal, type TemplateRef, type WritableSignal } from '@angular/core';

/**
 * Service PageActionsService
 * @class PageActionsService
 *
 * @description
 * Lets the currently activated page contribute its header action buttons to
 * the dashboard shell. A page registers a `TemplateRef` rather than a
 * component or a plain template string because an embedded view renders
 * with the *declaring page's* injector and change-detection context: the
 * page's own signals and click handlers work inside the projected markup
 * with zero injector plumbing between the page and the shell.
 *
 * Ownership transfers on **destruction, not navigation**: a page clears its
 * own registration from `registerPageActions`'s `destroyRef.onDestroy`
 * hook, which fires while the outgoing route is deactivated — strictly
 * before the next route's component is created — so a page can never leak
 * its action buttons onto a route it no longer owns. An earlier revision
 * cleared eagerly on every `Router` `NavigationStart` instead; that clears
 * a page's own registration on a same-route, query-params-only navigation
 * too (any `router.navigate` call, including one the still-active page
 * issues itself), and nothing re-registers it afterward, since a page's
 * `viewChild('pageActions')` template reference does not change unless the
 * page's own view is torn down. Destruction is the only signal this service
 * needs: a page that never triggers a real route change keeps its
 * registration, and one that does clears it exactly when it stops owning
 * the route.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class PageActionsService {
  //#region State
  /**
   * Property actionsState
   * @readonly
   *
   * @description
   * Backing signal for {@link actions}. Holds the template registered by the
   * currently activated page, or `null` when no page has registered one.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<TemplateRef<unknown> | null>}
   */
  private readonly actionsState: WritableSignal<TemplateRef<unknown> | null> =
    signal<TemplateRef<unknown> | null>(null);

  /**
   * Property actions
   * @readonly
   *
   * @description
   * Read-only view of the currently registered page action buttons,
   * consumed by the dashboard shell header to render them.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  public readonly actions: Signal<TemplateRef<unknown> | null> = this.actionsState.asReadonly();
  //#endregion

  //#region Public Methods
  /**
   * Method register
   * @method register
   *
   * @description
   * Registers the current page's header action buttons. The last call wins:
   * a page that re-registers (for example after a signal-driven template
   * swap) simply replaces its own previous registration.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} template - Template rendered inside the shell header.
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
   * Clears the registered page action buttons. Called with a template, it
   * clears only if that template is still the registered one — this
   * protects against a late `ngOnDestroy` from a page already navigated
   * away from clearing a page that navigated in after it. Called with no
   * argument, it clears unconditionally.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {TemplateRef<unknown>} [template] - Template to clear, when only clearing on ownership match.
   *
   * @returns {void}
   */
  public clear(template?: TemplateRef<unknown>): void {
    if (template !== undefined && this.actionsState() !== template) return;

    this.actionsState.set(null);
  }
  //#endregion
}

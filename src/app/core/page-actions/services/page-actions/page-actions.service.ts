import {
  DestroyRef,
  inject,
  Service,
  signal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

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
 * with zero injector plumbing between the page and the shell. Every
 * `NavigationStart` clears the current registration before the next route
 * takes over, so a page can never leak its action buttons onto a route it
 * no longer owns — a page that forgets to call {@link clear} on destroy is
 * still covered.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class PageActionsService {
  //#region Dependencies
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router instance whose navigation events drive the
   * auto-clear guarantee.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Destroy reference passed to `takeUntilDestroyed` to release the
   * router event subscription when the service is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

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

  //#region Constructor
  public constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((): void => this.clear());
  }
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
   * argument, it clears unconditionally, which is what the `NavigationStart`
   * guard above relies on.
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

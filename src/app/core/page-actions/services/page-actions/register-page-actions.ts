import { DestroyRef, effect, type Signal, type TemplateRef } from '@angular/core';
import type { PageActionsService } from './page-actions.service';

/**
 * Function registerPageActions
 *
 * @description
 * Wires a page's `#pageActions` template to `PageActionsService`: an effect
 * registers it whenever the `viewChild` resolves, and `destroyRef` clears the
 * page's own registration on teardown. Every dialect-B page repeats this
 * exact three-line dance (`ARCHITECTURE.md` §2.9's rule of three), so it is
 * extracted here rather than left as the third copy.
 *
 * It lives beside `PageActionsService` rather than in `utils/` because it is
 * not a pure function: it calls `effect()` and mutates through the injected
 * `PageActionsService` and `DestroyRef` a page passes in, which section
 * 10.13's "utils are pure" rule forbids. It stays a function taking
 * already-resolved dependencies — never `inject()`-ing its own — because
 * that is the shape every call site already has in its constructor, and a
 * directive would give the same three lines a component input/output
 * contract for no behavioral gain.
 *
 * @access public
 * @since 1.1.0
 *
 * @param {Signal<TemplateRef<unknown> | undefined>} pageActions - The page's `viewChild('pageActions')` signal.
 * @param {PageActionsService} pageActionsService - The shell's action-slot registry.
 * @param {DestroyRef} destroyRef - The page's own destroy reference.
 *
 * @returns {void}
 */
export function registerPageActions(
  pageActions: Signal<TemplateRef<unknown> | undefined>,
  pageActionsService: PageActionsService,
  destroyRef: DestroyRef,
): void {
  effect((): void => {
    const template: TemplateRef<unknown> | undefined = pageActions();
    if (template) pageActionsService.register(template);
  });

  destroyRef.onDestroy((): void => pageActionsService.clear(pageActions()));
}

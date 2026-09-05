import { DestroyRef, effect, type Signal, type TemplateRef } from '@angular/core';
import type { PageTabsService } from './page-tabs.service';

/**
 * Function registerPageTabs
 * @function registerPageTabs
 *
 * @description
 * Registers a page's `#pageTabs` template when its view resolves and releases
 * only that registration when the declaring page is destroyed.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Signal<TemplateRef<unknown> | undefined>} pageTabs - The page's tab template signal.
 * @param {PageTabsService} pageTabsService - The shell-level page tab registry.
 * @param {DestroyRef} destroyRef - Lifecycle owner of the contributing page.
 * @returns {void}
 */
export function registerPageTabs(
  pageTabs: Signal<TemplateRef<unknown> | undefined>,
  pageTabsService: PageTabsService,
  destroyRef: DestroyRef,
): void {
  effect((): void => {
    const template: TemplateRef<unknown> | undefined = pageTabs();
    if (template) pageTabsService.register(template);
  });

  destroyRef.onDestroy((): void => pageTabsService.clear(pageTabs()));
}

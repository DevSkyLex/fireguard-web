import { Directive, TemplateRef, inject } from '@angular/core';
import type { ActivityFeedItemContext } from './models';

/**
 * Directive ActivityFeedItemDirective
 * @class ActivityFeedItemDirective
 *
 * @description
 * Marks an `<ng-template appActivityFeedItem>` projected into
 * {@link ActivityFeed} as the entry template, overriding the feed's default
 * event/comment rendering. Captures the `TemplateRef` so the feed can render
 * it with an {@link ActivityFeedItemContext}.
 *
 * @example ```html
 * <ng-template appActivityFeedItem let-item>{{ item.authorLabel }}: {{ item.text }}</ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appActivityFeedItem]',
})
export class ActivityFeedItemDirective {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link ActivityFeedItemContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<ActivityFeedItemContext>}
   */
  public readonly templateRef: TemplateRef<ActivityFeedItemContext> =
    inject<TemplateRef<ActivityFeedItemContext>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the
   * `let-` bindings of a projected template to
   * {@link ActivityFeedItemContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ActivityFeedItemDirective} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {context is ActivityFeedItemContext} Always `true`; this is a type-level assertion only.
   */
  public static ngTemplateContextGuard(
    _directive: ActivityFeedItemDirective,
    _context: unknown,
  ): _context is ActivityFeedItemContext {
    return true;
  }
  //#endregion
}

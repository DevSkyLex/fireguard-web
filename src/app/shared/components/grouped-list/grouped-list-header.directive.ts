import { Directive, TemplateRef, inject } from '@angular/core';
import type { GroupedListHeaderContext } from './models';

/**
 * Directive GroupedListHeaderDirective
 * @class GroupedListHeaderDirective
 *
 * @description
 * Marks an `<ng-template appGroupedListHeader>` projected into
 * {@link GroupedList} as the section-header template. Captures the
 * `TemplateRef` so the list can render it with a
 * {@link GroupedListHeaderContext}; provides `ngTemplateContextGuard` so
 * consumers get typed `let-` bindings.
 *
 * @example ```html
 * <ng-template appGroupedListHeader let-group let-count="count">{{ group.id }} ({{ count }})</ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appGroupedListHeader]',
})
export class GroupedListHeaderDirective<T> {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link GroupedListHeaderContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<GroupedListHeaderContext<T>>}
   */
  public readonly templateRef: TemplateRef<GroupedListHeaderContext<T>> =
    inject<TemplateRef<GroupedListHeaderContext<T>>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the
   * `let-` bindings of a projected template to
   * {@link GroupedListHeaderContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {GroupedListHeaderDirective<T>} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {context is GroupedListHeaderContext<T>} Always `true`; this is a type-level assertion only.
   */
  public static ngTemplateContextGuard<T>(
    _directive: GroupedListHeaderDirective<T>,
    _context: unknown,
  ): _context is GroupedListHeaderContext<T> {
    return true;
  }
  //#endregion
}

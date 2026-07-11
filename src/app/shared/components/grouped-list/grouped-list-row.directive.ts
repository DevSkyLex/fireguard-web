import { Directive, TemplateRef, inject } from '@angular/core';
import type { GroupedListRowContext } from './models';

/**
 * Directive GroupedListRowDirective
 * @class GroupedListRowDirective
 *
 * @description
 * Marks an `<ng-template appGroupedListRow>` projected into
 * {@link GroupedList} as the row template. Captures the `TemplateRef` so the
 * list can render it with a {@link GroupedListRowContext}; provides
 * `ngTemplateContextGuard` so consumers get typed `let-` bindings.
 *
 * @example ```html
 * <ng-template appGroupedListRow let-item>{{ item.title }}</ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appGroupedListRow]',
})
export class GroupedListRowDirective<T> {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link GroupedListRowContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<GroupedListRowContext<T>>}
   */
  public readonly templateRef: TemplateRef<GroupedListRowContext<T>> =
    inject<TemplateRef<GroupedListRowContext<T>>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the
   * `let-` bindings of a projected template to {@link GroupedListRowContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {GroupedListRowDirective<T>} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {context is GroupedListRowContext<T>} Always `true`; this is a type-level assertion only.
   */
  public static ngTemplateContextGuard<T>(
    _directive: GroupedListRowDirective<T>,
    _context: unknown,
  ): _context is GroupedListRowContext<T> {
    return true;
  }
  //#endregion
}

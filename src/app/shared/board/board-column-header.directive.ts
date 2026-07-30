import { Directive, TemplateRef, inject } from '@angular/core';
import type { BoardColumnHeaderContext } from './models';

/**
 * Directive BoardColumnHeaderDirective
 * @class BoardColumnHeaderDirective
 *
 * @description
 * Marks an `<ng-template appBoardColumnHeader>` projected into {@link Board}
 * as the column-header template. Captures the `TemplateRef` so the board can
 * render it with a {@link BoardColumnHeaderContext}; provides
 * `ngTemplateContextGuard` so consumers get typed `let-` bindings.
 *
 * @example ```html
 * <ng-template appBoardColumnHeader let-column let-columnId="columnId" let-count="count">
 *   {{ columnId }} ({{ count }})
 * </ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appBoardColumnHeader]',
})
export class BoardColumnHeaderDirective<T> {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link BoardColumnHeaderContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<BoardColumnHeaderContext<T>>}
   */
  public readonly templateRef: TemplateRef<BoardColumnHeaderContext<T>> =
    inject<TemplateRef<BoardColumnHeaderContext<T>>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the
   * `let-` bindings of a projected template to {@link BoardColumnHeaderContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {BoardColumnHeaderDirective<T>} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {context is BoardColumnHeaderContext<T>} Always `true`; this is a type-level assertion only.
   */
  public static ngTemplateContextGuard<T>(
    _directive: BoardColumnHeaderDirective<T>,
    _context: unknown,
  ): _context is BoardColumnHeaderContext<T> {
    return true;
  }
  //#endregion
}

import { Directive, TemplateRef, inject } from '@angular/core';
import type { BoardCardContext } from './models';

/**
 * Directive BoardCardDirective
 * @class BoardCardDirective
 *
 * @description
 * Marks an `<ng-template appBoardCard>` projected into {@link Board} as the
 * card template. Captures the `TemplateRef` so the board can render it with
 * a {@link BoardCardContext}; provides `ngTemplateContextGuard` so consumers
 * get typed `let-` bindings.
 *
 * @example ```html
 * <ng-template appBoardCard let-item>{{ item.title }}</ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appBoardCard]',
})
export class BoardCardDirective<T> {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link BoardCardContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<BoardCardContext<T>>}
   */
  public readonly templateRef: TemplateRef<BoardCardContext<T>> =
    inject<TemplateRef<BoardCardContext<T>>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the
   * `let-` bindings of a projected template to {@link BoardCardContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {BoardCardDirective<T>} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {context is BoardCardContext<T>} Always `true`; this is a type-level assertion only.
   */
  public static ngTemplateContextGuard<T>(
    _directive: BoardCardDirective<T>,
    _context: unknown,
  ): _context is BoardCardContext<T> {
    return true;
  }
  //#endregion
}

import { Directive, inject, input, TemplateRef, type InputSignal } from '@angular/core';
import type { BoardColumnHeaderContext, BoardColumn } from '@shared/board/models';

/**
 * Directive BoardColumnHeaderDirective
 * @class BoardColumnHeaderDirective
 *
 * @description
 * Types the board column heading slot from the columns supplied by its consumer.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({ selector: 'ng-template[appBoardColumnHeader]' })
export class BoardColumnHeaderDirective<T, K extends string = string> {
  //#region Inputs
  /**
   * Property appBoardColumnHeader
   * @readonly
   *
   * @description
   * The same columns bound to Board, used to infer the template’s data types.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly BoardColumn<T, K>[]>}
   */
  public readonly appBoardColumnHeader: InputSignal<readonly BoardColumn<T, K>[]> =
    input.required<readonly BoardColumn<T, K>[]>();

  //#endregion

  //#region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * The caller’s column heading presentation, instantiated by Board.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<BoardColumnHeaderContext<T, K>>}
   */
  public readonly template: TemplateRef<BoardColumnHeaderContext<T, K>> = inject(TemplateRef);

  //#endregion

  //#region Methods
  /**
   * Method ngTemplateContextGuard
   * @method ngTemplateContextGuard
   *
   * @description
   * Narrows Angular let-bindings to the caller’s item and column types.
   *
   * @access public
   * @since 1.0.0
   * @static
   * @template T - The caller-owned card data.
   * @template K - The column identifier type.
   *
   * @param {BoardColumnHeaderDirective<T, K>} _directive - The typed template marker.
   * @param {unknown} _context - The context checked by Angular.
   * @returns {_context is BoardColumnHeaderContext<T, K>}
   */
  public static ngTemplateContextGuard<T, K extends string>(
    _directive: BoardColumnHeaderDirective<T, K>,
    _context: unknown,
  ): _context is BoardColumnHeaderContext<T, K> {
    return true;
  }
  //#endregion
}

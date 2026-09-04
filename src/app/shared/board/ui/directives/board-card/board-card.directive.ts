import { Directive, inject, input, TemplateRef, type InputSignal } from '@angular/core';
import type { BoardCardContext, BoardColumn } from '@shared/board/models';

/**
 * Directive BoardCardDirective
 * @class BoardCardDirective
 *
 * @description
 * Types the board card slot from the columns supplied by its consumer.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({ selector: 'ng-template[appBoardCard]' })
export class BoardCardDirective<T, K extends string = string> {
  //#region Inputs
  /**
   * Property appBoardCard
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
  public readonly appBoardCard: InputSignal<readonly BoardColumn<T, K>[]> =
    input.required<readonly BoardColumn<T, K>[]>();

  //#endregion

  //#region Properties
  /**
   * Property template
   * @readonly
   *
   * @description
   * The caller’s card presentation, instantiated by Board.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<BoardCardContext<T, K>>}
   */
  public readonly template: TemplateRef<BoardCardContext<T, K>> = inject(TemplateRef);

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
   * @param {BoardCardDirective<T, K>} _directive - The typed template marker.
   * @param {unknown} _context - The context checked by Angular.
   * @returns {_context is BoardCardContext<T, K>}
   */
  public static ngTemplateContextGuard<T, K extends string>(
    _directive: BoardCardDirective<T, K>,
    _context: unknown,
  ): _context is BoardCardContext<T, K> {
    return true;
  }
  //#endregion
}

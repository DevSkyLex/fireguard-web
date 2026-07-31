import { Directive, inject, TemplateRef } from '@angular/core';
import type { ChatMessageContext } from './models';

/**
 * Directive ChatMessageExtraDirective
 * @class ChatMessageExtraDirective
 *
 * @description
 * Marks an `<ng-template appChatMessageExtra>` as the block a consumer wants
 * rendered inside every message, under its body.
 *
 * This is the one seam through which domain-bearing content reaches a row —
 * reference cards, a preview, a per-message widget — without the row ever
 * learning what it is. `ngTemplateContextGuard` gives the consumer typed
 * `let-` bindings, so the template reads `message.data` without a cast.
 *
 * @example ```html
 * <ng-template appChatMessageExtra let-message>
 *   @for (reference of message.data.references; track reference.id) { … }
 * </ng-template>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appChatMessageExtra]',
})
export class ChatMessageExtraDirective<TData> {
  //#region Properties
  /**
   * Property templateRef
   * @readonly
   *
   * @description
   * The captured template, typed with its {@link ChatMessageContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {TemplateRef<ChatMessageContext<TData>>}
   */
  public readonly templateRef: TemplateRef<ChatMessageContext<TData>> =
    inject<TemplateRef<ChatMessageContext<TData>>>(TemplateRef);
  //#endregion

  //#region Type guard
  /**
   * Method ngTemplateContextGuard
   * @static
   *
   * @description
   * Compile-time hook letting the Angular template checker narrow the `let-`
   * bindings of a projected template to {@link ChatMessageContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ChatMessageExtraDirective<TData>} _directive - Directive instance (unused, required by the guard signature).
   * @param {unknown} _context - Candidate template context (unused, required by the guard signature).
   * @returns {_context is ChatMessageContext<TData>} Always `true`; a type-level assertion only.
   */
  public static ngTemplateContextGuard<TData>(
    _directive: ChatMessageExtraDirective<TData>,
    _context: unknown,
  ): _context is ChatMessageContext<TData> {
    return true;
  }
  //#endregion
}

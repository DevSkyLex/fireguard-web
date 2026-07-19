import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import { EmptyState, Skeleton } from '@shared/components';

/**
 * Component MessageThread
 * @class MessageThread
 *
 * @description
 * A conversation's messages, oldest first.
 *
 * Presentational. Two things it must get right: a deleted message keeps its row
 * with a null body (replies and reactions hang off it), and the author is a
 * bare member id until the member directory lands — so it is rendered as an
 * explicit placeholder rather than a blank.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-thread [messages]="store.messages()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-thread',
  imports: [DatePipe, EmptyState, Skeleton],
  templateUrl: './message-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageThread {
  //#region Inputs
  /**
   * Property messages
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MessageOutput[]>}
   */
  public readonly messages: InputSignal<readonly MessageOutput[]> = input<readonly MessageOutput[]>(
    [],
  );

  /**
   * Property loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Methods
  /**
   * Method initials
   *
   * @description
   * A two-character avatar stand-in derived from the member id, until the
   * directory can supply a real name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - The author's member id.
   *
   * @returns {string} The placeholder initials.
   */
  protected initials(memberId: string): string {
    return memberId.replaceAll('-', '').slice(0, 2).toUpperCase();
  }
  //#endregion
}

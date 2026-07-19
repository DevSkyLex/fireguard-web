import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { MessageOutput } from '@features/organization/features/messaging/models';
import type { MemberIdentity } from '@features/organization/state';
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

  /**
   * Property authors
   * @readonly
   *
   * @description
   * Member id → identity, supplied by the directory. A message whose author is
   * missing from it still renders — a member can be removed from the
   * organization while their messages stay.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<ReadonlyMap<string, MemberIdentity>>}
   */
  public readonly authors: InputSignal<ReadonlyMap<string, MemberIdentity>> = input<
    ReadonlyMap<string, MemberIdentity>
  >(new Map<string, MemberIdentity>());
  //#endregion

  //#region Methods
  /**
   * Method author
   *
   * @description
   * The author's identity, or a stable fallback when the directory does not
   * know them — a removed member must not blank out their own messages.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} memberId - The author's member id.
   *
   * @returns {MemberIdentity} The identity to render.
   */
  protected author(memberId: string): MemberIdentity {
    return (
      this.authors().get(memberId) ?? {
        id: memberId,
        displayName: $localize`:@@messaging.thread.formerMember:Former member`,
        initials: '??',
        avatarUrl: null,
      }
    );
  }
  //#endregion
}

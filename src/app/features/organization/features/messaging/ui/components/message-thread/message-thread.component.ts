import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import type {
  MessageOutput,
  MessageReaction,
} from '@features/organization/features/messaging/models';
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
  /**
   * Property currentMemberId
   * @readonly
   *
   * @description
   * Who "I" am. The API sends `memberIds` per emoji, so without this the UI
   * cannot tell "3 people reacted" from "3 people including me".
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property onlineMembers
   * @readonly
   *
   * @description
   * Members currently online. Absent from the set means offline **or**
   * unknown — presence expires server-side, so a missing id is not a claim
   * that someone left.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly onlineMembers: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property reactionToggled
   * @readonly
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<{ message: MessageOutput; emoji: string }>}
   */
  public readonly reactionToggled: OutputEmitterRef<{
    readonly message: MessageOutput;
    readonly emoji: string;
  }> = output<{ readonly message: MessageOutput; readonly emoji: string }>();

  /**
   * Property pinToggled
   * @readonly
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly pinToggled: OutputEmitterRef<MessageOutput> = output<MessageOutput>();

  /**
   * Property saveToggled
   * @readonly
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly saveToggled: OutputEmitterRef<MessageOutput> = output<MessageOutput>();

  /**
   * Property threadOpened
   * @readonly
   *
   * @access public
   * @since 4.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly threadOpened: OutputEmitterRef<MessageOutput> = output<MessageOutput>();
  //#endregion

  //#region Methods
  /**
   * Method hasReacted
   *
   * @description
   * Whether the current member is among an emoji's reactors.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MessageReaction} reaction - The reaction to test.
   *
   * @returns {boolean} `true` when the current member reacted.
   */
  protected hasReacted(reaction: MessageReaction): boolean {
    const memberId: string | null = this.currentMemberId();
    return memberId !== null && reaction.memberIds.includes(memberId);
  }

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

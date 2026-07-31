import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
} from '@angular/core';
import type { ChatReaction } from '../../models';

/**
 * Component ChatReactionList
 * @class ChatReactionList
 *
 * @description
 * The emoji tallies under a message.
 *
 * One markup for both states, not two. The read-only case used to be a copy of
 * the interactive one with `<button>` swapped for `<span>` — the two drifted
 * apart, and the second copy existed only to avoid announcing a toggle that
 * ignored its press. A disabled button says exactly that, once.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-chat-reaction-list [reactions]="message.reactions" (reacted)="react($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-reaction-list',
  imports: [],
  templateUrl: './chat-reaction-list.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatReactionList {
  //#region Inputs
  /**
   * Property reactions
   * @readonly
   *
   * @description
   * Tallies to show, in the order they should read.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChatReaction[]>}
   */
  public readonly reactions: InputSignal<readonly ChatReaction[]> = input<readonly ChatReaction[]>(
    [],
  );

  /**
   * Property interactive
   * @readonly
   *
   * @description
   * Whether pressing a tally toggles it. Off on surfaces that cannot act —
   * the chips stay readable, they just stop claiming to be controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly interactive: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Outputs
  /** Emits the emoji the reader is adding. */
  public readonly reacted: OutputEmitterRef<string> = output<string>();
  /** Emits the emoji the reader is taking back. */
  public readonly reactionRemoved: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Adds or takes back a reaction, according to whether the reader is already
   * counted in it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChatReaction} reaction - The tally that was pressed.
   *
   * @return {void}
   */
  protected toggle(reaction: ChatReaction): void {
    if (reaction.reactedByMe) {
      this.reactionRemoved.emit(reaction.emoji);

      return;
    }

    this.reacted.emit(reaction.emoji);
  }
  //#endregion
}

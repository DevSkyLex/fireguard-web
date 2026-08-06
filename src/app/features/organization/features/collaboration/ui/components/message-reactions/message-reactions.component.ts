import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSmilePlus } from '@ng-icons/lucide';
import type { MessageReactionOutput } from '@features/organization/features/collaboration/models';
import { HlmBubbleReactions } from '@shared/ui/bubble';
import { HlmButton } from '@shared/ui/button';
import {
  HlmPopover,
  HlmPopoverContent,
  HlmPopoverPortal,
  HlmPopoverTrigger,
} from '@shared/ui/popover';
import { HlmToggle } from '@shared/ui/toggle';
import { QUICK_REACTIONS } from './constants';

/**
 * Component MessageReactions
 * @class MessageReactions
 *
 * @description
 * The emoji tallies under a message, and the picker that adds one.
 *
 * Every chip is a toggle: pressing one the reader is already part of withdraws
 * their reaction. The parent is told which emoji was pressed and nothing else —
 * whether that means adding or removing is decided by whoever holds the tally,
 * because the answer is already in the row.
 *
 * A chip is a real button with an accessible name (`react with 👍, 3 so far`),
 * not a coloured pill: the count alone is not a label, and the emoji alone is
 * announced inconsistently. Each chip is a spartan `hlmToggle`, so the pressed
 * state is driven by the same primitive as the rest of the app, and the picker
 * is a spartan `popover`.
 *
 * The host itself carries `hlmBubbleReactions`, the slot spartan provides for
 * exactly this: it floats the cluster over the bubble's corner and drops its
 * own padding once it holds buttons (`has-[button]:p-0`). That is why this
 * component belongs *inside* `hlmBubble` rather than under it, and why it hides
 * itself rather than rendering an empty pill.
 *
 * An existing tally is always visible — it is content, not chrome. The bare
 * picker trigger is chrome: with nothing to tally yet it would otherwise float
 * over every message regardless of reactions, so it stays transparent and
 * inert until the message is hovered or a descendant gets focus, which also
 * keeps it keyboard-reachable via Tab rather than only on hover.
 *
 * @version 2.1.0
 *
 * @example
 * ```html
 * <app-message-reactions [reactions]="message.reactions" (toggled)="react($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-reactions',
  imports: [
    NgIcon,
    HlmButton,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal,
    HlmPopoverTrigger,
    HlmToggle,
  ],
  hostDirectives: [{ directive: HlmBubbleReactions, inputs: ['side', 'align'] }],
  providers: [provideIcons({ lucideSmilePlus })],
  templateUrl: './message-reactions.component.html',
  host: {
    class:
      'transition-opacity duration-150 focus-within:opacity-100 focus-within:pointer-events-auto group-hover/message:opacity-100 group-hover/message:pointer-events-auto group-focus-within/message:opacity-100 group-focus-within/message:pointer-events-auto',
    '[class.hidden]': '!hasAny()',
    '[class.opacity-0]': 'onlyPicker()',
    '[class.pointer-events-none]': 'onlyPicker()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageReactions {
  //#region Inputs
  /**
   * Property reactions
   * @readonly
   *
   * @description
   * The tallies to draw. An empty list draws only the picker trigger.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MessageReactionOutput[]>}
   */
  public readonly reactions: InputSignal<readonly MessageReactionOutput[]> =
    input.required<readonly MessageReactionOutput[]>();

  /**
   * Property canReact
   * @readonly
   *
   * @description
   * Whether the reader may react at all. Reacting is a write, and reading a
   * conversation does not grant it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReact: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property toggled
   * @readonly
   *
   * @description
   * Emits the emoji the reader pressed, whichever way it points.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly toggled: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property quickReactions
   * @readonly
   *
   * @description
   * The emojis the picker offers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly quickReactions: readonly string[] = QUICK_REACTIONS;

  /**
   * Property hasAny
   * @readonly
   *
   * @description
   * Whether anything is drawn at all, so an untouched message adds no row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasAny: Signal<boolean> = computed(
    (): boolean => this.reactions().length > 0 || this.canReact(),
  );

  /**
   * Property onlyPicker
   * @readonly
   *
   * @description
   * Whether the cluster holds nothing but the add-reaction trigger, which is
   * what decides whether it stays transparent until hovered or focused.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly onlyPicker: Signal<boolean> = computed(
    (): boolean => this.reactions().length === 0 && this.canReact(),
  );
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Reports the pressed emoji. The picker closes itself — it is a spartan
   * popover, and the template asks it to.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} emoji - The emoji pressed.
   *
   * @returns {void}
   */
  protected toggle(emoji: string): void {
    if (!this.canReact()) return;

    this.toggled.emit(emoji);
  }

  /**
   * Method labelFor
   * @method labelFor
   *
   * @description
   * Accessible name for a tally chip. The emoji and the count are both drawn,
   * but neither reads as a control on its own.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageReactionOutput} reaction - The tally being drawn.
   *
   * @returns {string} A sentence naming the emoji, the count and the direction.
   */
  protected labelFor(reaction: MessageReactionOutput): string {
    return reaction.reactedByMe
      ? $localize`:@@messages.reactions.withdraw:Withdraw your ${reaction.emoji}:emoji: reaction, ${reaction.count}:count: so far`
      : $localize`:@@messages.reactions.add:React with ${reaction.emoji}:emoji:, ${reaction.count}:count: so far`;
  }
  //#endregion
}

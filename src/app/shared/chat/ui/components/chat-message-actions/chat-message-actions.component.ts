import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

/**
 * Component ChatMessageActions
 * @class ChatMessageActions
 *
 * @description
 * The action bar that appears on a message: quick reactions, bookmark, and an
 * overflow menu for everything else.
 *
 * The split is deliberate. What stays on the bar is what a reader taps without
 * thinking; the rest — replying, copying, pinning, deleting — sits behind one
 * trigger, because a row with seven visible controls is a row nobody reads.
 * Deleting in particular should not be one stray click away from a reaction.
 *
 * Revealed on hover **and** `:focus-within`, which is what keeps it in keyboard
 * reach. Below the desktop breakpoint it is always shown and laid out in flow:
 * a touch device fires no hover and nothing inside takes focus without being
 * tapped first, so a hover-only bar simply did not exist on a phone; kept
 * absolute, it would sit permanently on top of the message above.
 *
 * **The reveal depends on `group` living on the row's host.** This component
 * renders inside that host and its `lg:group-hover:` variants resolve against
 * it — moving this markup out from under a `group` ancestor silently pins the
 * bar to invisible.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-chat-message-actions [isSaved]="message.isSaved" (deleted)="remove()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-chat-message-actions',
  imports: [ButtonModule, MenuModule],
  templateUrl: './chat-message-actions.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageActions {
  //#region Inputs
  /**
   * Property isSaved
   * @readonly
   *
   * @description
   * Whether the reader has bookmarked this message, which flips both the icon
   * and the button's name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isSaved: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property isPinned
   * @readonly
   *
   * @description
   * Whether the message is pinned, which turns the menu's pin entry into an
   * unpin.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isPinned: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property quickReactions
   * @readonly
   *
   * @description
   * Emoji offered directly in the bar, without opening anything.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly quickReactions: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property canReact
   * @readonly
   *
   * @description
   * Whether reacting is offered at all.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReact: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canPin
   * @readonly
   *
   * @description
   * Whether pinning is offered at all.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPin: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether bookmarking is offered at all.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canSave: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canReply
   * @readonly
   *
   * @description
   * Whether the message can be replied to.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReply: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canCopy
   * @readonly
   *
   * @description
   * Whether the message text can be copied.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canCopy: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property canMarkRead
   * @readonly
   *
   * @description
   * Whether the surface can move a read marker to this message.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canMarkRead: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canDelete
   * @readonly
   *
   * @description
   * Whether the reader may delete this message — decided per message, not per
   * surface.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDelete: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** Emits the emoji the reader picked. */
  public readonly reacted: OutputEmitterRef<string> = output<string>();
  /** Emits when the bookmark is toggled. */
  public readonly saveToggled: OutputEmitterRef<void> = output<void>();
  /** Emits when the pin is toggled; read {@link isPinned} for the direction. */
  public readonly pinToggled: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader wants to reply to this message. */
  public readonly replied: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader wants the message's text on the clipboard. */
  public readonly copied: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader wants the conversation marked read up to this message. */
  public readonly markedRead: OutputEmitterRef<void> = output<void>();
  /** Emits when the reader asks to delete this message. Confirming is the consumer's job. */
  public readonly deleted: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property menuOpen
   * @readonly
   *
   * @description
   * Whether the overflow menu is showing, which both announces the trigger's
   * state and holds the bar visible while the popup — appended to the body —
   * has the focus.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly menuOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property saveLabel
   * @readonly
   *
   * @description
   * The bookmark button's accessible name, which follows the toggle rather
   * than saying "Save message" while the button unsaves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly saveLabel: Signal<string> = computed((): string =>
    this.isSaved()
      ? $localize`:@@workspace.message.unsave.aria:Remove from saved messages`
      : $localize`:@@workspace.message.save.aria:Save message`,
  );

  /**
   * Property hasActions
   * @readonly
   *
   * @description
   * Whether the bar would draw anything. A surface can legitimately turn every
   * capability off — a reply thread's own root message does — and the bar is a
   * bordered pill that still renders when empty.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasActions: Signal<boolean> = computed(
    (): boolean =>
      this.canSave() ||
      (this.canReact() && this.quickReactions().length > 0) ||
      this.menuItems().length > 0,
  );

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * What the overflow trigger opens, in the order a reader reaches for it.
   *
   * Empty when every capability is off, which is what lets the template drop
   * the trigger entirely rather than open an empty popup.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const items: MenuItem[] = [];

    if (this.canReply()) {
      items.push({
        label: $localize`:@@chat.message.reply:Reply`,
        icon: 'pi pi-reply',
        command: (): void => this.replied.emit(),
      });
    }

    if (this.canCopy()) {
      items.push({
        label: $localize`:@@chat.message.copy:Copy message`,
        icon: 'pi pi-copy',
        command: (): void => this.copied.emit(),
      });
    }

    if (this.canMarkRead()) {
      items.push({
        label: $localize`:@@chat.message.markRead:Mark as read`,
        icon: 'pi pi-check-circle',
        command: (): void => this.markedRead.emit(),
      });
    }

    if (this.canPin()) {
      items.push({
        label: this.isPinned()
          ? $localize`:@@chat.message.unpin:Unpin message`
          : $localize`:@@chat.message.pin:Pin message`,
        icon: 'pi pi-thumbtack',
        command: (): void => this.pinToggled.emit(),
      });
    }

    if (this.canDelete()) {
      // A rule above it, and nothing else: the theme colours a menu item from
      // `.p-menu-item-content`, so tinting the row would mean overriding
      // PrimeNG's own internals — and the icon and the word already say
      // "destructive" without borrowing colour to say it.
      if (items.length > 0) items.push({ separator: true });

      items.push({
        label: $localize`:@@chat.message.delete:Delete message`,
        icon: 'pi pi-trash',
        command: (): void => this.deleted.emit(),
      });
    }

    return items;
  });
  //#endregion
}

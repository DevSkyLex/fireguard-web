import { TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  signal,
  type Signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';

/**
 * Maximum body length the domain accepts.
 *
 * The DTO advertises 40000, but the `MessageBody` value object trims and
 * rejects anything over 4000 — mirroring the looser number would only produce
 * a 422 the member cannot anticipate.
 */
const MAX_BODY_LENGTH = 4000;

/**
 * The emoji offered by the composer's palette — the prototype's single row of
 * common marks, not a full picker.
 */
const EMOJI_PALETTE: readonly string[] = [
  '👍',
  '✅',
  '👀',
  '🔥',
  '🎉',
  '⚠️',
  '❌',
  '🙏',
  '😀',
  '😅',
  '🤝',
  '💡',
  '📎',
  '🚧',
  '🧯',
  '🛠️',
];

/**
 * Component MessageComposer
 * @class MessageComposer
 *
 * @description
 * The message input at the foot of a conversation: an auto-growing textarea,
 * a tool row, and send/discard actions.
 *
 * Enter sends, Shift+Enter breaks the line — the convention the source
 * prototype uses and the one members expect from a chat surface.
 *
 * Presentational: it emits what the member typed and never posts anything
 * itself.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-composer [placeholder]="'Message #general'" (sent)="post($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-composer',
  imports: [ButtonModule, PopoverModule, TextFieldModule],
  templateUrl: './message-composer.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  //#region Inputs
  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Prompt shown while the composer is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a send is in flight, which disables submission.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** Emits the trimmed body the member wants to send. */
  public readonly sent: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property draft
   *
   * @description
   * What the member has typed so far.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draft: WritableSignal<string> = signal<string>('');

  /**
   * Property maxLength
   * @readonly
   *
   * @description
   * Body ceiling enforced by the domain.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly maxLength: number = MAX_BODY_LENGTH;

  /**
   * Property palette
   * @readonly
   *
   * @description
   * Emoji offered by the insert popover.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {readonly string[]}
   */
  protected readonly palette: readonly string[] = EMOJI_PALETTE;

  /**
   * Property emojiOpen
   * @readonly
   *
   * @description
   * Whether the emoji palette is showing, mirrored from the popover's events
   * so the trigger can announce its disclosure state.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly emojiOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property input
   * @readonly
   *
   * @description
   * The textarea, read to insert an emoji at the caret rather than at the end.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLTextAreaElement>>}
   */
  private readonly input: Signal<ElementRef<HTMLTextAreaElement>> =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('input');

  /**
   * Property emojiTrigger
   * @readonly
   *
   * @description
   * The palette's trigger, so focus can be returned when the popover is
   * dismissed without inserting anything.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement>>}
   */
  private readonly emojiTrigger: Signal<ElementRef<HTMLButtonElement>> =
    viewChild.required<ElementRef<HTMLButtonElement>>('emojiTrigger');

  /**
   * Property emojiPopover
   * @readonly
   *
   * @description
   * The palette overlay, read only to tell "focus is still inside the closing
   * popover" from "focus was moved somewhere on purpose".
   *
   * @access private
   * @since 1.2.0
   *
   * @type {Signal<Popover>}
   */
  private readonly emojiPopover: Signal<Popover> = viewChild.required<Popover>('emojiPopover');

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * Whether the draft is worth sending: non-blank, within the limit, and no
   * send already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed((): boolean => {
    const trimmed: string = this.draft().trim();

    return trimmed.length > 0 && trimmed.length <= MAX_BODY_LENGTH && !this.pending();
  });

  /**
   * Property remaining
   * @readonly
   *
   * @description
   * Characters left, surfaced only as the member approaches the ceiling.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly remaining: Signal<number | null> = computed((): number | null => {
    const left: number = MAX_BODY_LENGTH - this.draft().trim().length;

    return left <= 200 ? left : null;
  });

  /**
   * Method onEmojiHide
   * @method onEmojiHide
   *
   * @description
   * Hands focus back to the trigger when the palette was dismissed without
   * choosing anything.
   *
   * Guarded on `document.body`: PrimeNG emits `onHide` asynchronously, after
   * {@link insertEmoji} has already put focus back in the textarea, so an
   * unconditional restore would steal it away mid-sentence.
   *
   * @access protected
   * @since 1.2.0
   *
   * @return {void}
   */
  protected onEmojiHide(): void {
    this.emojiOpen.set(false);

    if (typeof document === 'undefined') return;

    // PrimeNG emits `onHide` *before* it detaches the overlay, so at this point
    // focus is still on the palette button the member dismissed from — testing
    // for `document.body` (as this first did) never matched, and Escape left
    // focus nowhere at all. Restore only when focus has not been moved
    // somewhere deliberate, such as the textarea after inserting an emoji.
    const active: Element | null = document.activeElement;
    const container: HTMLElement | null | undefined = this.emojiPopover().container;

    if (active !== document.body && !(container?.contains(active) ?? false)) return;

    this.emojiTrigger().nativeElement.focus();
  }
  //#endregion

  //#region Methods
  /**
   * Method onInput
   * @method onInput
   *
   * @description
   * Tracks the textarea's value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Input event from the textarea.
   *
   * @return {void}
   */
  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Sends on Enter, and lets Shift+Enter insert a line break.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - Keydown event from the textarea.
   *
   * @return {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.send();
  }

  /**
   * Method send
   * @method send
   *
   * @description
   * Emits the trimmed draft and clears the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected send(): void {
    if (!this.canSend()) return;

    this.sent.emit(this.draft().trim());
    this.draft.set('');
  }

  /**
   * Method insertEmoji
   * @method insertEmoji
   *
   * @description
   * Inserts an emoji at the caret, replacing any selection, and leaves the
   * caret after it so typing can continue.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} emoji - Emoji picked from the palette.
   *
   * @return {void}
   */
  protected insertEmoji(emoji: string): void {
    const textarea: HTMLTextAreaElement = this.input().nativeElement;
    const draft: string = this.draft();
    const start: number = textarea.selectionStart ?? draft.length;
    const end: number = textarea.selectionEnd ?? start;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    // The DOM is written before the signal so the caret survives: once the
    // `[value]` binding flushes it assigns an identical string, which is a
    // no-op for the selection.
    textarea.value = next;
    const caret: number = start + emoji.length;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);

    this.draft.set(next);
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Clears the composer without sending.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected discard(): void {
    this.draft.set('');
  }
  //#endregion
}

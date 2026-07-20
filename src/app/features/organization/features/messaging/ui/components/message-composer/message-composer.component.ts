import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import type { MemberIdentity } from '@features/organization/state';

/**
 * An `@` typed at a word boundary, followed by the name fragment being typed.
 * Anchored to the caret so a mention is only offered where one can be inserted.
 */
const MENTION_QUERY_PATTERN: RegExp = /(?:^|\s)@([\p{L}\p{N}_.-]*)$/u;

/** How many members the popover offers at once, as in the design kit. */
const MENTION_LIMIT: number = 6;

/**
 * Component MessageComposer
 * @class MessageComposer
 *
 * @description
 * The two-row message composer of the design kit: a borderless textarea over a
 * toolbar carrying the assistant, mention, shortcut, emoji and attachment
 * actions on the left, and Discard / Send on the right.
 *
 * Typing `@` opens the member popover and picking one inserts the backend's
 * `@{memberUuid}` token, so the mentioned member is actually notified.
 *
 * Purely presentational — it owns no draft persistence and no transport. The
 * page passes the draft through the two-way `draft` model and reacts to the
 * outputs. `shortcutsRequested` is published but not yet answered.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-composer',
  imports: [FormsModule, ButtonModule, Textarea],
  templateUrl: './message-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  //#region Properties
  /**
   * Property draft
   *
   * @description
   * The composed text, two-way bound so the owning page keeps authority over
   * draft persistence.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ModelSignal<string>}
   */
  public readonly draft: ModelSignal<string> = model<string>('');

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Scoped to the open conversation by the page — the kit shows the channel or
   * the person being addressed, not a generic prompt.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Property pendingFile
   * @readonly
   *
   * @description
   * The attachment staged for the next message, rendered as a removable chip.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<File | null>}
   */
  public readonly pendingFile: InputSignal<File | null> = input<File | null>(null);

  /**
   * Property sending
   * @readonly
   *
   * @description
   * Whether a send is in flight; drives the Send button's spinner.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly sending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Reply variant: same two rows, but without the assistant and shortcut
   * actions, which belong to the main thread only.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compact: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property sent
   * @readonly
   *
   * @description
   * The member asked to post the draft, by button or by Enter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly sent: OutputEmitterRef<void> = output<void>();

  /**
   * Property discarded
   * @readonly
   *
   * @description
   * The member dropped the draft and any staged attachment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly discarded: OutputEmitterRef<void> = output<void>();

  /**
   * Property fileSelected
   * @readonly
   *
   * @description
   * A file was chosen for the next message.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<File>}
   */
  public readonly fileSelected: OutputEmitterRef<File> = output<File>();

  /**
   * Property fileCleared
   * @readonly
   *
   * @description
   * The staged attachment was removed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly fileCleared: OutputEmitterRef<void> = output<void>();

  /**
   * Property assistantRequested
   * @readonly
   *
   * @description
   * The member asked the assistant about this thread.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly assistantRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property mentionRequested
   * @readonly
   *
   * @description
   * The member pressed the mention action. The popover is handled locally; the
   * output exists so the page can react (analytics, focus) if it cares.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly mentionRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property shortcutsRequested
   * @readonly
   *
   * @description
   * The member pressed the shortcuts action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly shortcutsRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property members
   * @readonly
   *
   * @description
   * The directory the mention popover offers. Empty disables mentions rather
   * than showing an empty list.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<readonly MemberIdentity[]>}
   */
  public readonly members: InputSignal<readonly MemberIdentity[]> = input<
    readonly MemberIdentity[]
  >([]);

  /**
   * Property field
   * @readonly
   *
   * @description
   * The textarea, needed for its caret: a mention is only offered for the `@`
   * the member is currently typing, which the bound value alone cannot tell.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLTextAreaElement> | undefined>}
   */
  protected readonly field: Signal<ElementRef<HTMLTextAreaElement> | undefined> =
    viewChild<ElementRef<HTMLTextAreaElement>>('field');

  /**
   * Property mentionQuery
   * @readonly
   *
   * @description
   * The name fragment typed after `@`, or `null` when the caret is not in a
   * mention. Empty string is meaningful: a bare `@` offers everyone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly mentionQuery: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property mentionIndex
   * @readonly
   *
   * @description
   * Which match the arrow keys have landed on.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly mentionIndex: WritableSignal<number> = signal<number>(0);

  /**
   * Property mentionMatches
   * @readonly
   *
   * @description
   * Members whose display name contains the query, capped for the popover.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly MemberIdentity[]>}
   */
  protected readonly mentionMatches: Signal<readonly MemberIdentity[]> = computed(
    (): readonly MemberIdentity[] => {
      const query: string | null = this.mentionQuery();
      if (query === null) return [];

      const needle: string = query.toLowerCase();

      return this.members()
        .filter((member: MemberIdentity): boolean =>
          member.displayName.toLowerCase().includes(needle),
        )
        .slice(0, MENTION_LIMIT);
    },
  );

  /**
   * Property mentionOpen
   * @readonly
   *
   * @description
   * Whether the popover shows. It stays open on an empty result so the member
   * sees "no members match" instead of silence.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly mentionOpen: Signal<boolean> = computed(
    (): boolean => this.mentionQuery() !== null && this.members().length > 0,
  );

  /**
   * Property emojiOpen
   * @readonly
   *
   * @description
   * Whether the emoji grid is showing. Local to the composer — nothing outside
   * it cares.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly emojiOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property emojis
   * @readonly
   *
   * @description
   * The design kit's eight one-tap emoji, laid out as a four-column grid. Kept
   * local rather than shared with the thread's reaction picker: two usages do
   * not yet earn an abstraction.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly emojis: readonly string[] = ['👍', '❤️', '🎉', '✅', '🙏', '🔥', '👀', '⚠️'];

  /**
   * Property resolvedPlaceholder
   * @readonly
   *
   * @description
   * The page's scoped prompt when it supplies one, otherwise the generic
   * default. Resolved here rather than in the template because an `i18n-`
   * attribute cannot be made conditional.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly resolvedPlaceholder: Signal<string> = computed(
    (): string =>
      this.placeholder() || $localize`:@@messaging.composer.placeholder:Write a message…`,
  );

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * A message needs text or an attachment, and no send already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed(
    (): boolean =>
      (this.draft().trim().length > 0 || this.pendingFile() !== null) && !this.sending(),
  );

  /**
   * Property canDiscard
   * @readonly
   *
   * @description
   * Discard only means something once there is something to drop.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDiscard: Signal<boolean> = computed(
    (): boolean => this.draft().length > 0 || this.pendingFile() !== null,
  );
  //#endregion

  //#region Methods
  /**
   * Method onKeydown
   *
   * @description
   * Enter sends, Shift+Enter breaks the line.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The originating key press.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    // The popover owns the keyboard while it is up, so Enter completes the
    // mention instead of posting a half-typed name.
    if (this.mentionOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeMention();
        return;
      }

      const matches: readonly MemberIdentity[] = this.mentionMatches();

      if (matches.length > 0) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const step: number = event.key === 'ArrowDown' ? 1 : matches.length - 1;
          this.mentionIndex.update((index: number): number => (index + step) % matches.length);
          return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          const picked: MemberIdentity | undefined = matches[this.mentionIndex()] ?? matches[0];
          if (picked) this.pickMention(picked);
          return;
        }
      }
    }

    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.submit();
  }

  /**
   * Method onDraftInput
   *
   * @description
   * Re-reads the caret to decide whether a mention is being typed. Driven by
   * the DOM `input` event rather than the model, because the model carries no
   * caret and `@` only opens the popover where it can actually insert.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onDraftInput(): void {
    const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;
    if (!element) return;

    const caret: number = element.selectionStart ?? 0;
    const match: RegExpExecArray | null = MENTION_QUERY_PATTERN.exec(this.draft().slice(0, caret));

    this.mentionQuery.set(match === null ? null : (match[1] ?? ''));
    this.mentionIndex.set(0);
  }

  /**
   * Method closeMention
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected closeMention(): void {
    this.mentionQuery.set(null);
    this.mentionIndex.set(0);
  }

  /**
   * Method startMention
   *
   * @description
   * The toolbar's `@` action: types the character for the member and opens the
   * popover on everyone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected startMention(): void {
    const draft: string = this.draft();
    const needsSpace: boolean = draft.length > 0 && !draft.endsWith(' ');

    this.draft.set(`${draft}${needsSpace ? ' ' : ''}@`);
    this.mentionQuery.set('');
    this.mentionIndex.set(0);
    this.mentionRequested.emit();
    this.focusField();
  }

  /**
   * Method pickMention
   *
   * @description
   * Swaps the `@fragment` under the caret for the backend's `@{memberUuid}`
   * token — the exact form `MentionExtractor` parses, so the mentioned member
   * is actually notified.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MemberIdentity} member - The chosen member.
   *
   * @returns {void}
   */
  protected pickMention(member: MemberIdentity): void {
    const draft: string = this.draft();
    const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;
    const caret: number = element?.selectionStart ?? draft.length;
    const match: RegExpExecArray | null = MENTION_QUERY_PATTERN.exec(draft.slice(0, caret));

    if (match === null) {
      this.closeMention();
      return;
    }

    // `match[0]` is the boundary character plus `@` plus the fragment, so the
    // `@` sits that many characters back from the end of the match.
    const fragment: string = match[1] ?? '';
    const at: number = match.index + match[0].length - fragment.length - 1;
    const token: string = `@{${member.id}} `;

    this.draft.set(`${draft.slice(0, at)}${token}${draft.slice(caret)}`);
    this.closeMention();
    this.focusField(at + token.length);
  }

  /**
   * Method focusField
   *
   * @description
   * Returns focus to the textarea, optionally placing the caret. Deferred by a
   * turn because the bound value has not reached the DOM yet.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {number} [caret] - Where to put the caret; end of text when omitted.
   *
   * @returns {void}
   */
  private focusField(caret?: number): void {
    setTimeout((): void => {
      const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;
      if (!element) return;

      element.focus();

      const position: number = caret ?? element.value.length;
      element.setSelectionRange(position, position);
    });
  }

  /**
   * Method submit
   *
   * @description
   * Posts the draft, closing the emoji grid on the way out.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (!this.canSend()) return;

    this.emojiOpen.set(false);
    this.sent.emit();
  }

  /**
   * Method discard
   *
   * @description
   * Drops the draft locally and tells the page to clear what it persisted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected discard(): void {
    this.emojiOpen.set(false);
    this.draft.set('');
    this.discarded.emit();
  }

  /**
   * Method onFileSelected
   *
   * @description
   * Forwards the chosen file and resets the input so picking the same file
   * twice in a row still fires a change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The file input's change event.
   *
   * @returns {void}
   */
  protected onFileSelected(event: Event): void {
    const target: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = target.files?.[0];

    if (file) this.fileSelected.emit(file);

    target.value = '';
  }

  /**
   * Method toggleEmoji
   *
   * @description
   * Opens or closes the emoji grid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected toggleEmoji(): void {
    this.emojiOpen.update((open: boolean): boolean => !open);
  }

  /**
   * Method insertEmoji
   *
   * @description
   * Appends an emoji to the draft and closes the grid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} emoji - The chosen emoji.
   *
   * @returns {void}
   */
  protected insertEmoji(emoji: string): void {
    this.draft.update((current: string): string => `${current}${emoji}`);
    this.emojiOpen.set(false);
  }
  //#endregion
}

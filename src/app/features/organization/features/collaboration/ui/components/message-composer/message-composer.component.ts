import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  signal,
  type Signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { EditorModule, type EditorTextChangeEvent } from 'primeng/editor';
import { ListboxModule } from 'primeng/listbox';
import { Popover, PopoverModule } from 'primeng/popover';
import type {
  MentionQuery,
  QuillEditor,
} from '@features/organization/features/collaboration/models';
import {
  applyMentionMarkers,
  findMentionQuery,
  normalizeEditorHtml,
} from '@features/organization/features/collaboration/utils';
import type { MemberDirectoryEntry } from '@features/organization/models';

/**
 * Maximum body length the domain accepts.
 *
 * Measured on the **serialized HTML**, not on what was typed: that is what the
 * `MessageBody` value object validates, and the editor's markup is several
 * times the length of its text. Counting characters typed would let a formatted
 * message sail past the limit and come back a 422 nobody could anticipate.
 */
const MAX_BODY_LENGTH = 4000;

/** How many members the mention list offers at once. */
const MAX_MENTION_SUGGESTIONS = 8;

/** Keys the mention list claims while it is open. */
const MENTION_KEYS: ReadonlySet<string> = new Set<string>([
  'ArrowDown',
  'ArrowUp',
  'Enter',
  'Tab',
  'Escape',
]);

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
 * The message input at the foot of a conversation: a PrimeNG (Quill) editor
 * with a trimmed toolbar, an `@` mention picker, an emoji palette, and
 * send/discard actions.
 *
 * Enter sends, Shift+Enter breaks the line — the convention members expect from
 * a chat surface, and the opposite of the editor's own default.
 *
 * The toolbar carries only marks that survive the round trip. The API sanitizes
 * bodies against a fixed allow-list (`config/packages/html_sanitizer.yaml`) that
 * keeps no attribute but `a[href]`, so anything the editor expresses through a
 * class — alignment, indentation, colour — would be silently dropped on the way
 * in and must not be offered.
 *
 * Presentational: it emits the body and never posts anything itself, and it is
 * handed the member list rather than reading the directory, which is
 * route-provided and gated behind a permission the composer knows nothing about.
 *
 * @version 3.0.0
 *
 * @example
 * ```html
 * <app-message-composer [members]="members()" (sent)="post($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-composer',
  imports: [AvatarModule, ButtonModule, EditorModule, FormsModule, ListboxModule, PopoverModule],
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

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who may be mentioned. Empty when the caller cannot read the directory, in
   * which case the `@` picker simply never opens — a member without
   * `organization.members.read` can still write, they just get no suggestions.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<readonly MemberDirectoryEntry[]>}
   */
  public readonly members: InputSignal<readonly MemberDirectoryEntry[]> = input<
    readonly MemberDirectoryEntry[]
  >([]);
  //#endregion

  //#region Outputs
  /** Emits the body: sanitizer-safe HTML carrying `@{memberUuid}` markers. */
  public readonly sent: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
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
   * Property activeMention
   *
   * @description
   * Index of the highlighted suggestion. The caret never leaves the editor, so
   * this is what the arrow keys move and what `aria-activedescendant` points at.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly activeMention: WritableSignal<number> = signal<number>(0);

  /**
   * Property draftHtml
   *
   * @description
   * The editor's serialized content, as it last changed.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {WritableSignal<string>}
   */
  private readonly draftHtml: WritableSignal<string> = signal<string>('');

  /**
   * Property plainLength
   *
   * @description
   * Trimmed plain-text length, which is what tells an empty draft from the
   * editor's blank `<p><br></p>`.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly plainLength: WritableSignal<number> = signal<number>(0);

  /**
   * Property mentionQuery
   *
   * @description
   * The `@…` the caret is inside, or `null`. Recomputed from the editor rather
   * than derived from a signal: the caret lives in Quill, not here.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {WritableSignal<MentionQuery | null>}
   */
  private readonly mentionQuery: WritableSignal<MentionQuery | null> = signal<MentionQuery | null>(
    null,
  );

  /**
   * Property mentions
   *
   * @description
   * Member id by the label inserted for them. The draft shows names; this is
   * what turns them back into `@{memberUuid}` markers on send.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<ReadonlyMap<string, string>>}
   */
  private readonly mentions: WritableSignal<ReadonlyMap<string, string>> = signal<
    ReadonlyMap<string, string>
  >(new Map<string, string>());

  /**
   * Property editor
   *
   * @description
   * The Quill instance, once `p-editor` has built it. Absent on the server and
   * until the dynamic import resolves in the browser.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {QuillEditor | null}
   */
  private editor: QuillEditor | null = null;

  /**
   * Property editorRoot
   *
   * @description
   * The contenteditable, held as a signal so the mention list's ARIA wiring can
   * be kept in step by an effect. Quill builds this element, so there is no
   * template binding to put those attributes on.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {WritableSignal<HTMLElement | null>}
   */
  private readonly editorRoot: WritableSignal<HTMLElement | null> = signal<HTMLElement | null>(
    null,
  );

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
   * Read as an `ElementRef` because the reference names a `p-button`: the
   * component exposes no focus method, and the focusable element is the
   * `<button>` it renders inside its host.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly emojiTrigger: Signal<ElementRef<HTMLElement>> = viewChild.required(
    'emojiTrigger',
    { read: ElementRef },
  );

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
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Members matching the active query. Empty means the list is not showing —
   * there is no separate "open" flag to keep in step with it.
   *
   * Inactive members are left out: mentioning someone who has left notifies
   * nobody.
   *
   * @access protected
   * @since 2.0.0
   *
   * Not `readonly`: PrimeNG's `options` input is a mutable `any[]`, and a
   * readonly array is not assignable to it. The array is freshly built here on
   * every read, so nothing is actually shared to mutate.
   *
   * @type {Signal<MemberDirectoryEntry[]>}
   */
  protected readonly mentionCandidates: Signal<MemberDirectoryEntry[]> = computed(
    (): MemberDirectoryEntry[] => {
      const query: MentionQuery | null = this.mentionQuery();

      if (query === null) return [];

      const term: string = query.term.trim().toLowerCase();

      return this.members()
        .filter(
          (member: MemberDirectoryEntry): boolean =>
            member.isActive &&
            (term.length === 0 || member.displayName.toLowerCase().includes(term)),
        )
        .slice(0, MAX_MENTION_SUGGESTIONS);
    },
  );

  /**
   * Property activeMember
   * @readonly
   *
   * @description
   * The candidate the arrow keys have landed on, or `null`.
   *
   * It is the listbox's *selected* value: PrimeNG has no input for "highlight
   * this row", and selection is the state that means "this is what Enter would
   * insert". The theme's own focus ring still follows the pointer on top of it.
   *
   * @access protected
   * @since 3.2.0
   *
   * @type {Signal<MemberDirectoryEntry | null>}
   */
  protected readonly activeMember: Signal<MemberDirectoryEntry | null> = computed(
    (): MemberDirectoryEntry | null => this.mentionCandidates()[this.activeMention()] ?? null,
  );

  /**
   * Property body
   * @readonly
   *
   * @description
   * The draft as it will be posted: mention labels substituted for markers.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly body: Signal<string> = computed((): string =>
    applyMentionMarkers(this.draftHtml(), this.mentions()),
  );

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * Whether the draft is worth sending: it has text, it fits the limit, and no
   * send is already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed(
    (): boolean =>
      this.plainLength() > 0 && this.body().length <= MAX_BODY_LENGTH && !this.pending(),
  );

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
    const left: number = MAX_BODY_LENGTH - this.body().length;

    return left >= 0 && left <= 200 ? left : null;
  });

  /**
   * Property overflow
   * @readonly
   *
   * @description
   * How far past the ceiling the serialized body is, or `0`.
   *
   * The editor has no `maxlength` to lean on — it is a contenteditable — so
   * this is the only warning the member gets, and it is stated as a number
   * rather than left to a disabled button.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly overflow: Signal<number> = computed((): number =>
    Math.max(0, this.body().length - MAX_BODY_LENGTH),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Claims the keys the composer overrides, in the **capture** phase on the
   * host.
   *
   * Quill installs its own `keydown` listener on the editor root and bails on
   * `event.defaultPrevented`, so a listener that runs first is all it takes to
   * take Enter back from it. A template `(keydown)` would bubble, and by then
   * Quill has already inserted the line break.
   *
   * @since 3.0.0
   */
  public constructor() {
    const host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef: DestroyRef = inject(DestroyRef);
    const listener = (event: KeyboardEvent): void => this.onKeydown(event);

    host.addEventListener('keydown', listener, true);
    destroyRef.onDestroy((): void => host.removeEventListener('keydown', listener, true));

    effect((): void => {
      const root: HTMLElement | null = this.editorRoot();

      if (root === null) return;

      if (this.mentionCandidates().length === 0) {
        root.removeAttribute('aria-controls');
        root.removeAttribute('aria-activedescendant');

        return;
      }

      root.setAttribute('aria-controls', 'message-composer-mentions');
      root.setAttribute(
        'aria-activedescendant',
        `message-composer-mentions_${this.activeMention()}`,
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onEditorInit
   * @method onEditorInit
   *
   * @description
   * Keeps the Quill instance the editor just built.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {{ editor: QuillEditor }} event - The editor's init event.
   *
   * @return {void}
   */
  protected onEditorInit(event: { editor: QuillEditor }): void {
    this.editor = event.editor;
    this.editorRoot.set(event.editor.root);
    // Quill builds the field itself, so there is no template to name it from.
    event.editor.root.setAttribute(
      'aria-label',
      $localize`:@@workspace.composer.aria:Write a message`,
    );
    event.editor.root.setAttribute('aria-autocomplete', 'list');
    // The field is the editable Quill creates, not an element this template
    // owns, so its test id has to be applied here — and it has to exist: the
    // e2e suite drives composing through it.
    event.editor.root.setAttribute('data-testid', 'message-composer-input');
  }

  /**
   * Method onTextChange
   * @method onTextChange
   *
   * @description
   * Tracks what the editor holds, and re-reads the mention query — a keystroke
   * is also what re-opens a list Escape had closed.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {EditorTextChangeEvent} event - The editor's text-change event.
   *
   * @return {void}
   */
  protected onTextChange(event: EditorTextChangeEvent): void {
    this.draftHtml.set(normalizeEditorHtml(event.htmlValue ?? ''));
    this.plainLength.set((event.textValue ?? '').trim().length);
    this.activeMention.set(0);
    this.refreshMentionQuery();
  }

  /**
   * Method onSelectionChange
   * @method onSelectionChange
   *
   * @description
   * Re-reads the mention query after a caret move that changed nothing else.
   *
   * @access protected
   * @since 3.0.0
   *
   * @return {void}
   */
  protected onSelectionChange(): void {
    this.refreshMentionQuery();
  }

  /**
   * Method refreshMentionQuery
   * @method refreshMentionQuery
   *
   * @description
   * Recomputes the active `@…` from the editor's caret.
   *
   * Only the text **before** the caret is read, which makes the offsets
   * `findMentionQuery` returns usable as Quill indices directly: a prefix of
   * `getText()` shares the editor's index space.
   *
   * @access private
   * @since 3.0.0
   *
   * @return {void}
   */
  private refreshMentionQuery(): void {
    const editor: QuillEditor | null = this.editor;
    const range = editor?.getSelection() ?? null;

    if (editor === null || range === null) {
      this.mentionQuery.set(null);

      return;
    }

    const before: string = editor.getText(0, range.index);

    this.mentionQuery.set(findMentionQuery(before, before.length));
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Drives the mention list while it is open, and otherwise sends on Enter and
   * lets Shift+Enter insert a line break.
   *
   * The list is navigated without ever taking the caret out of the editor,
   * which is what `aria-activedescendant` on the editor is for.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - Keydown seen on the way down to the editor.
   *
   * @return {void}
   */
  private onKeydown(event: KeyboardEvent): void {
    // The palette and the toolbar are inside the host too; only keys typed in
    // the editor are ours to claim.
    if (!(event.target as HTMLElement | null)?.closest('.ql-editor')) return;

    const candidates: readonly MemberDirectoryEntry[] = this.mentionCandidates();

    if (candidates.length > 0 && MENTION_KEYS.has(event.key)) {
      event.preventDefault();

      if (event.key === 'Escape') {
        this.mentionQuery.set(null);

        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.moveMention(event.key === 'ArrowDown' ? 1 : -1);

        return;
      }

      this.acceptMention(candidates[this.activeMention()] ?? candidates[0]);

      return;
    }

    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.send();
  }

  /**
   * Method moveMention
   * @method moveMention
   *
   * @description
   * Moves the highlight, wrapping at both ends.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {number} delta - `1` to go down, `-1` to go up.
   *
   * @return {void}
   */
  private moveMention(delta: number): void {
    const total: number = this.mentionCandidates().length;

    this.activeMention.update((index: number): number => (index + delta + total) % total);
  }

  /**
   * Method acceptMention
   * @method acceptMention
   *
   * @description
   * Replaces the `@…` the caret is in with the member's name, and remembers
   * which id that name stands for.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MemberDirectoryEntry} member - Chosen member.
   *
   * @return {void}
   */
  protected acceptMention(member: MemberDirectoryEntry): void {
    const editor: QuillEditor | null = this.editor;
    const query: MentionQuery | null = this.mentionQuery();

    if (editor === null || query === null) return;

    const label: string = this.labelFor(member);

    // Belt and braces after a pointer accept: the panel cancels `mousedown` so
    // focus never leaves, but if anything ever does take it, this puts the
    // caret back before the text is rewritten under it.
    editor.focus();

    this.mentions.update(
      (current: ReadonlyMap<string, string>): ReadonlyMap<string, string> =>
        new Map<string, string>(current).set(label, member.memberId),
    );

    editor.deleteText(query.start, query.end - query.start, 'user');
    // The trailing space is what closes the list: a term ending on whitespace
    // is not a query, so accepting does not immediately re-open on itself.
    editor.insertText(query.start, `@${label} `, 'user');
    editor.setSelection(query.start + label.length + 2, 0, 'user');
  }

  /**
   * Method labelFor
   * @method labelFor
   *
   * @description
   * The name to insert for a member, disambiguated when the draft already uses
   * that name for somebody else.
   *
   * Two members really can share a display name — the directory falls back to
   * the member id only when the API sends no name at all — and the mapping back
   * to ids is by label, so a collision would silently mention the wrong person.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {MemberDirectoryEntry} member - Member being inserted.
   *
   * @return {string} A label unique within this draft.
   */
  private labelFor(member: MemberDirectoryEntry): string {
    const taken: string | undefined = this.mentions().get(member.displayName);

    if (taken === undefined || taken === member.memberId) return member.displayName;

    return `${member.displayName} (${member.memberId.slice(0, 4)})`;
  }

  /**
   * Method openMention
   * @method openMention
   *
   * @description
   * Types an `@` at the caret, which is all it takes to open the picker.
   *
   * @access protected
   * @since 2.0.0
   *
   * @return {void}
   */
  protected openMention(): void {
    const editor: QuillEditor | null = this.editor;

    if (editor === null) return;

    editor.focus();

    const index: number = editor.getSelection()?.index ?? editor.getText().length;
    const before: string = editor.getText(0, index);
    // An `@` only opens a mention at the start of a word, so a separator is
    // added when the caret sits mid-word.
    const separator: string = index > 0 && !/[\s([{<"']/.test(before.slice(-1)) ? ' ' : '';

    this.activeMention.set(0);
    editor.insertText(index, `${separator}@`, 'user');
    editor.setSelection(index + separator.length + 1, 0, 'user');
  }

  /**
   * Method insertEmoji
   * @method insertEmoji
   *
   * @description
   * Inserts an emoji at the caret and leaves the caret after it so typing can
   * continue.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} emoji - Emoji picked from the palette.
   *
   * @return {void}
   */
  protected insertEmoji(emoji: string): void {
    const editor: QuillEditor | null = this.editor;

    if (editor === null) return;

    editor.focus();

    const index: number = editor.getSelection()?.index ?? editor.getText().length;

    editor.insertText(index, emoji, 'user');
    editor.setSelection(index + emoji.length, 0, 'user');
  }

  /**
   * Method onEmojiHide
   * @method onEmojiHide
   *
   * @description
   * Hands focus back to the trigger when the palette was dismissed without
   * choosing anything.
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
    // somewhere deliberate, such as the editor after inserting an emoji.
    const active: Element | null = document.activeElement;
    const container: HTMLElement | null | undefined = this.emojiPopover().container;

    if (active !== document.body && !(container?.contains(active) ?? false)) return;

    this.emojiTrigger().nativeElement.querySelector('button')?.focus();
  }

  /**
   * Method send
   * @method send
   *
   * @description
   * Emits the body and clears the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected send(): void {
    if (!this.canSend()) return;

    this.sent.emit(this.body());
    this.reset();
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
    this.reset();
  }

  /**
   * Method reset
   * @method reset
   *
   * @description
   * Empties the editor and everything derived from it, including the mention
   * pairings — keeping those would let a name typed by hand in the next message
   * silently resolve to the previous message's member.
   *
   * @access private
   * @since 2.0.0
   *
   * @return {void}
   */
  private reset(): void {
    // `setText` reports itself as an API change, so no `onTextChange` follows
    // and the mirrored state has to be cleared here.
    this.editor?.setText('');
    this.draftHtml.set('');
    this.plainLength.set(0);
    this.mentions.set(new Map<string, string>());
    this.mentionQuery.set(null);
    this.activeMention.set(0);
  }
  //#endregion
}

import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowUp } from '@ng-icons/lucide';
import type { MentionQuery } from '@features/organization/features/collaboration/models';
import {
  applyMentionMarkers,
  findMentionQuery,
} from '@features/organization/features/collaboration/utils';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { HlmAlert, HlmAlertDescription } from '@shared/ui/alert';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmFieldError } from '@shared/ui/field';
import {
  HlmInputGroup,
  HlmInputGroupAddon,
  HlmInputGroupButton,
  HlmInputGroupTextarea,
} from '@shared/ui/input-group';
import { HlmItem, HlmItemContent, HlmItemMedia, HlmItemTitle } from '@shared/ui/item';
import { HlmKbd } from '@shared/ui/kbd';
import {
  MENTION_SUGGESTION_LIMIT,
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_COUNTER_THRESHOLD,
} from './constants';
import type { MessageComposerValues } from './models';

/**
 * Component MessageComposer
 * @class MessageComposer
 *
 * @description
 * Where a message is written. It owns its model and rules and emits
 * {@link sent} with the body; the page calls the store
 * (`ARCHITECTURE.md` §10.4).
 *
 * Enter sends and Shift+Enter starts a line, which is what a conversation
 * surface is expected to do — the form's submit button stays for anyone who
 * reaches it by keyboard or does not know the shortcut.
 *
 * The card is spartan's `input-group`: the textarea is its control and the row
 * of actions its `block-end` addon, so the border, the focus ring and the send
 * button are one surface rather than three hand-matched ones.
 *
 * The height is still driven from TypeScript. `HlmTextarea` sizes itself with
 * `field-sizing: content`, which Safari and Firefox do not implement, and a
 * composer that will not grow is a worse failure than a redundant measurement.
 *
 * A member who may read a conversation cannot necessarily write in it, so
 * {@link readOnly} renders a plain notice instead of a control that would be
 * refused: a disabled textarea with no explanation reads as a bug.
 *
 * The mention list is the one surface here that is not a spartan primitive.
 * `autocomplete` and `command` are both built around a combobox bound to an
 * input's whole value, not a suggestion anchored to a caret position inside a
 * multiline draft — the query here is a function of caret and text together
 * (see {@link mentionQuery}) — and `popover` would take focus out of the
 * textarea the reader is still typing in. Its rows are `hlmItem` and its
 * surface mirrors `hlm-popover-content` token for token, so the deviation is
 * mechanical rather than visual.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-message-composer [pending]="isPosting()" (sent)="send($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-composer',
  imports: [
    FormField,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmFieldError,
    HlmInputGroup,
    HlmInputGroupAddon,
    HlmInputGroupButton,
    HlmInputGroupTextarea,
    HlmItem,
    HlmItemContent,
    HlmItemMedia,
    HlmItemTitle,
    HlmKbd,
  ],
  providers: [provideIcons({ lucideArrowUp })],
  templateUrl: './message-composer.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a message is already on its way, which disables sending another.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property readOnly
   * @readonly
   *
   * @description
   * Whether the member may read this conversation but not write in it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly readOnly: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Prompt shown in the empty field, usually naming the counterpart.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who can be mentioned here. Supplied already narrowed — the composer offers
   * whatever it is given and decides nothing about who belongs.
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
  /**
   * Property sent
   * @readonly
   *
   * @description
   * Emits the message body once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly sent: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The message being written. `form()` writes through to this signal rather
   * than keeping a copy, so it is the single source of truth.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<MessageComposerValues>}
   */
  protected readonly model: WritableSignal<MessageComposerValues> = signal<MessageComposerValues>({
    body: '',
  });

  /**
   * Property composerForm
   * @readonly
   *
   * @description
   * The field tree and its rules. The length cap mirrors the domain's, not the
   * DTO's — see {@link MESSAGE_BODY_MAX_LENGTH}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<MessageComposerValues>}
   */
  protected readonly composerForm: FieldTree<MessageComposerValues> = form(
    this.model,
    (path): void => {
      required(path.body, {
        message: $localize`:@@messages.composer.required:Write a message first`,
      });
      maxLength(path.body, MESSAGE_BODY_MAX_LENGTH, {
        message: $localize`:@@messages.composer.tooLong:This message is too long`,
      });
    },
  );

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * Whether the send control should accept a press.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed(
    (): boolean => !this.pending() && !this.readOnly() && this.model().body.trim().length > 0,
  );

  /**
   * Property remaining
   * @readonly
   *
   * @description
   * Characters left before the cap, shown only once the cap is in sight.
   * `null` while the message is nowhere near it.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly remaining: Signal<number | null> = computed((): number | null => {
    const left: number = MESSAGE_BODY_MAX_LENGTH - this.model().body.length;

    return left <= MESSAGE_COUNTER_THRESHOLD ? left : null;
  });

  /**
   * Property field
   * @readonly
   *
   * @description
   * The textarea, addressed directly because its height is measured rather
   * than declared.
   *
   * @access protected
   * @since 2.0.0
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
   * The `@…` the caret is inside, or `null` when it is not in one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MentionQuery | null>}
   */
  protected readonly mentionQuery: Signal<MentionQuery | null> = computed((): MentionQuery | null =>
    findMentionQuery(this.model().body, this.caret()),
  );

  /**
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Members matching the active query, capped so the list never covers the
   * conversation it is being written into. Empty whenever the list should not
   * be showing at all — no query, nothing matching, or dismissed with Escape.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly mentionCandidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      const query: MentionQuery | null = this.mentionQuery();

      if (query === null || this.readOnly()) return [];
      if (query.term === this.dismissedMention()) return [];

      const needle: string = query.term.toLocaleLowerCase();

      return this.members()
        .filter((member: MemberDirectoryEntry): boolean =>
          member.displayName.toLocaleLowerCase().includes(needle),
        )
        .slice(0, MENTION_SUGGESTION_LIMIT);
    },
  );

  /**
   * Property activeMention
   * @readonly
   *
   * @description
   * Index of the highlighted suggestion.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly activeMention: WritableSignal<number> = signal<number>(0);

  /**
   * Property activeMentionId
   * @readonly
   *
   * @description
   * DOM id of the highlighted suggestion, so the field can point a screen
   * reader at it while focus stays in the textarea. `null` closes the link.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly activeMentionId: Signal<string | null> = computed((): string | null => {
    const member: MemberDirectoryEntry | undefined = this.mentionCandidates()[this.activeMention()];

    return member === undefined ? null : `mention-option-${member.memberId}`;
  });

  /** Caret offset in the draft, which is half of what decides the active query. */
  private readonly caret: WritableSignal<number> = signal<number>(0);

  /** Query term the list was dismissed for, so Escape does not re-open on it. */
  private readonly dismissedMention: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Member id by inserted label, for the markers applied on send.
   *
   * A plain `Map` rather than a signal: nothing renders from it, and rewriting
   * it on every accepted mention would re-run the draft's computeds for a value
   * only the submit path reads.
   */
  private readonly pickedMentions = new Map<string, string>();
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Keeps the field's height matched to its content. A textarea cannot size
   * itself to its text, so the height is cleared and re-read from `scrollHeight`
   * on every change — including the send that empties it, which is what returns
   * the card to one line.
   *
   * @access public
   * @since 2.0.0
   */
  public constructor() {
    afterRenderEffect((): void => {
      const body: string = this.model().body;
      const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;

      if (element === undefined) return;

      element.style.height = 'auto';
      element.style.height = body.length === 0 ? '' : `${element.scrollHeight}px`;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits the trimmed body and clears the field, so the composer is ready for
   * the next message rather than waiting on a round trip. The send itself is
   * optimistic, so the message is already on screen.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.composerForm().markAsTouched();

    if (this.composerForm().invalid() || !this.canSend()) return;

    this.sent.emit(applyMentionMarkers(this.model().body.trim(), this.pickedMentions));
    this.pickedMentions.clear();
    this.model.set({ body: '' });
    this.composerForm().reset();
    this.closeMentions();
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Drives the mention list while it is open — arrows move, Enter and Tab
   * accept, Escape dismisses — and otherwise sends on Enter, leaving
   * Shift+Enter to start a new line.
   *
   * The list takes Enter first on purpose: with a suggestion highlighted, Enter
   * means "that one", and sending instead would post a half-typed name. A
   * composition still in progress is left alone either way — an IME uses Enter
   * to accept a candidate, and intercepting it would send half a word.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {KeyboardEvent} event - The keystroke.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;

    if (this.mentionCandidates().length > 0) {
      if (this.handleMentionKey(event)) return;
    }

    if (event.key !== 'Enter' || event.shiftKey) return;

    this.submit(event);
  }

  /**
   * Method onFieldChanged
   * @method onFieldChanged
   *
   * @description
   * Re-reads the caret so the mention list follows it. Bound to every event
   * that can move a caret without changing the text — a click, an arrow key —
   * as well as typing, because the query is a function of both.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onFieldChanged(): void {
    this.caret.set(this.field()?.nativeElement.selectionStart ?? 0);
  }

  /**
   * Method acceptMention
   * @method acceptMention
   *
   * @description
   * Replaces the `@…` the caret sits in with the member's name and records the
   * pairing, so the name can become a marker again on send.
   *
   * The draft keeps the name rather than the id: it has to stay something a
   * human can read and edit. The trailing space is what closes the list, since
   * a query never ends on whitespace.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MemberDirectoryEntry} member - The chosen member.
   *
   * @returns {void}
   */
  protected acceptMention(member: MemberDirectoryEntry): void {
    const query: MentionQuery | null = this.mentionQuery();
    const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;

    if (query === null || element === undefined) return;

    const body: string = this.model().body;
    const inserted = `@${member.displayName} `;
    const next: string = body.slice(0, query.start) + inserted + body.slice(query.end);

    this.pickedMentions.set(member.displayName, member.memberId);
    this.model.set({ body: next });

    const caretAfter: number = query.start + inserted.length;
    element.value = next;
    element.setSelectionRange(caretAfter, caretAfter);
    element.focus();
    this.caret.set(caretAfter);
    this.activeMention.set(0);
  }

  /**
   * Method handleMentionKey
   * @method handleMentionKey
   *
   * @description
   * Applies one keystroke to the open mention list.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {KeyboardEvent} event - The keystroke.
   *
   * @returns {boolean} Whether the list consumed it.
   */
  private handleMentionKey(event: KeyboardEvent): boolean {
    const candidates: readonly MemberDirectoryEntry[] = this.mentionCandidates();

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step: number = event.key === 'ArrowDown' ? 1 : candidates.length - 1;
      this.activeMention.set((this.activeMention() + step) % candidates.length);

      return true;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const chosen: MemberDirectoryEntry | undefined = candidates[this.activeMention()];

      if (chosen !== undefined) this.acceptMention(chosen);

      return true;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMentions();

      return true;
    }

    return false;
  }

  /**
   * Method closeMentions
   * @method closeMentions
   *
   * @description
   * Dismisses the mention list without touching the draft, by remembering the
   * query it was dismissed for.
   *
   * @access private
   * @since 2.0.0
   *
   * @returns {void}
   */
  private closeMentions(): void {
    this.dismissedMention.set(this.mentionQuery()?.term ?? null);
    this.activeMention.set(0);
  }
  //#endregion
}

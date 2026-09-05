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
import { lucideAtSign } from '@ng-icons/lucide';
import type {
  InterventionMentionQuery,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import {
  findInterventionMentionQuery,
  interventionMemberId,
} from '@features/organization/features/interventions/utils';
import { serverMessagesOf } from '@shared/form-feedback';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { COMMENT_MENTION_SUGGESTION_LIMIT } from './constants/intervention-comment-mention.constants';
import type { InterventionCommentFormValues, InterventionCommentSelectedMention } from './models';

/** Longest a comment may be — mirrors what `InterventionService.addComment` accepts. */
const COMMENT_MAX_LENGTH: number = 2000;

/** A blank comment. */
const EMPTY_VALUES: InterventionCommentFormValues = { body: '' };

/**
 * Component InterventionCommentForm
 * @class InterventionCommentForm
 *
 * @description
 * Where a comment is written onto the intervention's activity thread. Plain
 * text, no rich editor — the thread already carries system entries with
 * their own formatting, and a comment is read alongside them, not composed
 * as a separate document.
 *
 * Typing `@` — or pressing the at-sign button, for anyone who does not know
 * the shortcut — opens a picker over {@link members}. Picking one inserts
 * `@Display name` in the editable draft. The selected member is retained
 * locally and that visible marker is converted to the backend's
 * `@{memberUuid}` token only when the form emits. A manually typed name is
 * left as plain text, so choosing a suggestion remains the act that creates
 * a notification.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-intervention-comment-form
 *   [pending]="commentPending()"
 *   [serverError]="commentError()"
 *   [members]="planningOptions.members()"
 *   (submitted)="postComment($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-comment-form',
  imports: [
    FormField,
    NgIcon,
    HlmButton,
    ...HlmSpinnerImports,
    ...HlmFieldImports,
    ...HlmInputGroupImports,
    ...HlmItemImports,
    ...HlmAvatarImports,
  ],
  providers: [provideIcons({ lucideAtSign })],
  templateUrl: './intervention-comment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCommentForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether a comment is already being posted.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether commenting is unavailable at all.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property online
   * @readonly
   * @description Whether the network is reachable. When `false`, the form tells the agent their comment will be queued and sent on reconnect rather than posting now — `PRODUCT.md` makes an offline comment a queued action, not a failure.
   * @access public
   * @since 3.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last post failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property members
   * @readonly
   * @description Who can be mentioned here. Supplied already narrowed — the form offers whatever it is given and decides nothing about who belongs.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The validated, trimmed comment body.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   * @description The comment being drafted.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionCommentFormValues>}
   */
  protected readonly model: WritableSignal<InterventionCommentFormValues> =
    signal<InterventionCommentFormValues>(EMPTY_VALUES);

  /**
   * Property commentForm
   * @readonly
   * @description The body field and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<InterventionCommentFormValues>}
   */
  protected readonly commentForm: FieldTree<InterventionCommentFormValues> = form(
    this.model,
    (path) => {
      required(path.body, {
        message: $localize`:@@intervention.comment.required:Write a comment first.`,
      });
      maxLength(path.body, COMMENT_MAX_LENGTH, {
        message: $localize`:@@intervention.comment.tooLong:This comment is too long.`,
      });
    },
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected post, as flat lines above the field.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@intervention.workspace.commentAddFailed:The comment could not be posted.`,
    ),
  );

  /**
   * Property field
   * @readonly
   * @description The textarea, addressed directly so a mention insertion can set its caret.
   * @access protected
   * @since 2.0.0
   * @type {Signal<ElementRef<HTMLTextAreaElement> | undefined>}
   */
  protected readonly field: Signal<ElementRef<HTMLTextAreaElement> | undefined> =
    viewChild<ElementRef<HTMLTextAreaElement>>('field');

  /**
   * Property mentionQuery
   * @readonly
   * @description The `@…` the caret is inside, or `null` when it is not in one.
   * @access protected
   * @since 2.0.0
   * @type {Signal<InterventionMentionQuery | null>}
   */
  protected readonly mentionQuery: Signal<InterventionMentionQuery | null> = computed(
    (): InterventionMentionQuery | null =>
      findInterventionMentionQuery(this.model().body, this.caret()),
  );

  /**
   * Property mentionCandidates
   * @readonly
   *
   * @description
   * Members matching the active query, capped so the list never covers the
   * comment being written. Empty whenever the list should not be showing at
   * all — no query, nothing matching, or dismissed with Escape.
   *
   * @access protected
   * @since 2.0.0
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly mentionCandidates: Signal<readonly MemberSelectOption[]> = computed(
    (): readonly MemberSelectOption[] => {
      const query: InterventionMentionQuery | null = this.mentionQuery();

      if (query === null || this.disabled()) return [];
      if (query.term === this.dismissedMention()) return [];

      const needle: string = query.term.toLocaleLowerCase();

      return this.members()
        .filter((member: MemberSelectOption): boolean =>
          member.displayName.toLocaleLowerCase().includes(needle),
        )
        .slice(0, COMMENT_MENTION_SUGGESTION_LIMIT);
    },
  );

  /**
   * Property activeMention
   * @readonly
   * @description Index of the highlighted suggestion.
   * @access protected
   * @since 2.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly activeMention: WritableSignal<number> = signal<number>(0);

  /**
   * Property activeMentionId
   * @readonly
   * @description DOM id of the highlighted suggestion, so the field can point a screen reader at it while focus stays in the textarea. `null` closes the link.
   * @access protected
   * @since 2.0.0
   * @type {Signal<string | null>}
   */
  protected readonly activeMentionId: Signal<string | null> = computed((): string | null => {
    const member: MemberSelectOption | undefined = this.mentionCandidates()[this.activeMention()];

    return member === undefined ? null : `intervention-comment-mention-${member.value}`;
  });

  /** Caret offset in the draft, which is half of what decides the active query. */
  private readonly caret: WritableSignal<number> = signal<number>(0);

  /** Query term the list was dismissed for, so Escape does not re-open on it. */
  private readonly dismissedMention: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property selectedMentions
   * @readonly
   *
   * @description
   * Picker-created mention occurrences that still exist unchanged in the draft.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {WritableSignal<readonly InterventionCommentSelectedMention[]>}
   */
  private readonly selectedMentions: WritableSignal<readonly InterventionCommentSelectedMention[]> =
    signal<readonly InterventionCommentSelectedMention[]>([]);

  /**
   * Property lastBody
   * @readonly
   *
   * @description
   * Previous textarea value used to move or invalidate selected mention ranges after an edit.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {WritableSignal<string>}
   */
  private readonly lastBody: WritableSignal<string> = signal<string>('');
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   * @description Keeps the field's height matched to its content, the same measurement `MessageComposer` uses — `field-sizing: content` is not implemented in Safari or Firefox.
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
   *
   * @description
   * Validates, emits the trimmed body, then clears the field — a posted
   * comment is optimistic (the store appends it before the response lands),
   * so the composer is ready for the next one rather than waiting on a round
   * trip.
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
    this.commentForm().markAsTouched();

    if (this.commentForm().invalid() || this.pending() || this.disabled()) return;

    this.submitted.emit(this.serializeBody(this.model().body).trim());
    this.model.set(EMPTY_VALUES);
    this.selectedMentions.set([]);
    this.lastBody.set('');
    this.commentForm().reset();
    this.closeMentions();
  }

  /**
   * Method onKeydown
   *
   * @description
   * Drives the mention list while it is open — arrows move, Enter and Tab
   * accept, Escape dismisses — and otherwise leaves the keystroke alone, so
   * Enter still starts a new line as a plain textarea does.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {KeyboardEvent} event - The keystroke.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing || this.mentionCandidates().length === 0) return;

    this.handleMentionKey(event);
  }

  /**
   * Method onFieldChanged
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
   * Method onFieldInput
   * @method onFieldInput
   *
   * @description
   * Reconciles picker-created mention ranges with one textarea edit and resets
   * the highlighted suggestion for the new query.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {Event} event - Native textarea input event carrying the edited value.
   * @returns {void}
   */
  protected onFieldInput(event: Event): void {
    const element: HTMLTextAreaElement | null =
      event.currentTarget instanceof HTMLTextAreaElement ? event.currentTarget : null;

    if (element === null) return;

    const next: string = element.value;
    this.selectedMentions.update((mentions): readonly InterventionCommentSelectedMention[] =>
      this.reconcileSelectedMentions(mentions, this.lastBody(), next),
    );
    this.lastBody.set(next);
    this.caret.set(element.selectionStart);
    this.activeMention.set(0);
  }

  /**
   * Method acceptMention
   *
   * @description
   * Replaces the `@…` the caret sits in with the member's readable display
   * name and remembers the API identity for serialization on submit.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MemberSelectOption} member - The chosen member.
   *
   * @returns {void}
   */
  protected acceptMention(member: MemberSelectOption): void {
    const query: InterventionMentionQuery | null = this.mentionQuery();
    const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;

    if (query === null || element === undefined) return;

    const body: string = this.model().body;
    const marker: string = `@${member.displayName}`;
    const inserted: string = `${marker} `;
    const next: string = body.slice(0, query.start) + inserted + body.slice(query.end);

    this.model.set({ body: next });
    this.selectedMentions.update((selected): readonly InterventionCommentSelectedMention[] => [
      ...this.reconcileSelectedMentions(selected, body, next),
      { member, start: query.start, end: query.start + marker.length },
    ]);
    this.lastBody.set(next);

    const caretAfter: number = query.start + inserted.length;
    element.value = next;
    element.setSelectionRange(caretAfter, caretAfter);
    element.focus();
    this.caret.set(caretAfter);
    this.activeMention.set(0);
  }

  /**
   * Method triggerMention
   *
   * @description
   * Opens the picker from the at-sign button rather than the keyboard, by
   * inserting `@` at the caret exactly as typing it would.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected triggerMention(): void {
    const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;

    if (element === undefined) return;

    const caret: number = element.selectionStart;
    const body: string = this.model().body;
    const next: string = body.slice(0, caret) + '@' + body.slice(caret);

    this.model.set({ body: next });
    this.selectedMentions.update((mentions): readonly InterventionCommentSelectedMention[] =>
      this.reconcileSelectedMentions(mentions, body, next),
    );
    this.lastBody.set(next);

    const caretAfter: number = caret + 1;
    element.value = next;
    element.setSelectionRange(caretAfter, caretAfter);
    element.focus();
    this.caret.set(caretAfter);
  }

  /**
   * Method handleMentionKey
   *
   * @description Applies one keystroke to the open mention list.
   * @access private
   * @since 2.0.0
   *
   * @param {KeyboardEvent} event - The keystroke.
   *
   * @returns {void}
   */
  private handleMentionKey(event: KeyboardEvent): void {
    const candidates: readonly MemberSelectOption[] = this.mentionCandidates();

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step: number = event.key === 'ArrowDown' ? 1 : candidates.length - 1;
      this.activeMention.set((this.activeMention() + step) % candidates.length);

      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const chosen: MemberSelectOption | undefined = candidates[this.activeMention()];

      if (chosen !== undefined) this.acceptMention(chosen);

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMentions();
    }
  }

  /**
   * Method closeMentions
   * @description Dismisses the mention list without touching the draft, by remembering the query it was dismissed for.
   * @access private
   * @since 2.0.0
   * @returns {void}
   */
  private closeMentions(): void {
    this.dismissedMention.set(this.mentionQuery()?.term ?? null);
    this.activeMention.set(0);
  }

  /**
   * Method serializeBody
   * @description Converts visible mentions chosen from the picker to the API token while leaving ordinary typed text unchanged.
   * @access private
   * @since 2.1.0
   * @param {string} body - The readable comment draft.
   * @returns {string} The body accepted by the intervention comment endpoint.
   */
  private serializeBody(body: string): string {
    let serialized: string = body;
    const mentions: readonly InterventionCommentSelectedMention[] =
      this.selectedMentions().toSorted(
        (
          left: InterventionCommentSelectedMention,
          right: InterventionCommentSelectedMention,
        ): number => right.start - left.start,
      );

    for (const mention of mentions) {
      const marker: string = `@${mention.member.displayName}`;
      const followingCharacter: string | undefined = serialized[mention.end];

      if (serialized.slice(mention.start, mention.end) !== marker) continue;
      if (followingCharacter !== undefined && /[\p{L}\p{N}_]/u.test(followingCharacter)) continue;

      const token: string = `@{${interventionMemberId(mention.member)}}`;
      serialized = serialized.slice(0, mention.start) + token + serialized.slice(mention.end);
    }

    return serialized;
  }

  /**
   * Method reconcileSelectedMentions
   * @method reconcileSelectedMentions
   *
   * @description
   * Shifts mention ranges around a textarea edit and drops any occurrence the
   * edit touched, so only unchanged picker selections retain notification intent.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {readonly InterventionCommentSelectedMention[]} mentions - Existing selected occurrences.
   * @param {string} previous - Draft before the edit.
   * @param {string} next - Draft after the edit.
   * @returns {readonly InterventionCommentSelectedMention[]} Surviving occurrences in the new draft.
   */
  private reconcileSelectedMentions(
    mentions: readonly InterventionCommentSelectedMention[],
    previous: string,
    next: string,
  ): readonly InterventionCommentSelectedMention[] {
    if (previous === next) return mentions;

    let prefix = 0;
    const sharedLength: number = Math.min(previous.length, next.length);
    while (prefix < sharedLength && previous[prefix] === next[prefix]) prefix++;

    let suffix = 0;
    while (
      suffix < previous.length - prefix &&
      suffix < next.length - prefix &&
      previous[previous.length - suffix - 1] === next[next.length - suffix - 1]
    )
      suffix++;

    const previousEnd: number = previous.length - suffix;
    const nextEnd: number = next.length - suffix;
    const delta: number = nextEnd - prefix - (previousEnd - prefix);

    return mentions.flatMap((mention): readonly InterventionCommentSelectedMention[] => {
      let start: number = mention.start;
      let end: number = mention.end;

      if (mention.start >= previousEnd) {
        start += delta;
        end += delta;
      } else if (mention.end > prefix) {
        return [];
      }

      const marker: string = `@${mention.member.displayName}`;
      return next.slice(start, end) === marker ? [{ ...mention, start, end }] : [];
    });
  }
  //#endregion
}

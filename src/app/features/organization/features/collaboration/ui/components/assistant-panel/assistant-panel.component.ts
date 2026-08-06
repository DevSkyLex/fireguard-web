import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
  viewChild,
  type ElementRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowUp, lucidePenLine, lucideSparkles, lucideX } from '@ng-icons/lucide';
import type { AssistantMessageOutput } from '@features/organization/features/collaboration/models';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { HlmAlert, HlmAlertAction, HlmAlertDescription } from '@shared/ui/alert';
import { HlmBubble, HlmBubbleContent } from '@shared/ui/bubble';
import { HlmButton } from '@shared/ui/button';
import {
  HlmInputGroup,
  HlmInputGroupAddon,
  HlmInputGroupButton,
  HlmInputGroupTextarea,
} from '@shared/ui/input-group';
import { HlmMarker, HlmMarkerContent } from '@shared/ui/marker';
import { HlmMessage, HlmMessageContent } from '@shared/ui/message';
import { ASSISTANT_MAX_QUESTION_LENGTH, ASSISTANT_SUGGESTIONS } from './constants';
import type { AssistantQuestionValues } from './models';

/**
 * Component AssistantPanel
 * @class AssistantPanel
 *
 * @description
 * The assistant's contextual column: the thread, its live generation, and the
 * composer that feeds it.
 *
 * A feature-owned shell widget rather than a page — it injects its own store
 * because it is the owner of that state and is summoned from the shell rather
 * than routed to (`ARCHITECTURE.md` §2.7).
 *
 * **The transcript is deliberately not a live region.** A reply arrives as ~20
 * Mercure frames, each carrying the whole accumulated answer rather than a
 * delta, so `aria-live` would make a screen reader restart the paragraph on
 * every frame. A sibling `role="status"` line announces the state instead, and
 * the transcript stays silently readable under `aria-busy`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-assistant-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-assistant-panel',
  imports: [
    NgIcon,
    FormField,
    HlmAlert,
    HlmAlertAction,
    HlmAlertDescription,
    HlmBubble,
    HlmBubbleContent,
    HlmButton,
    HlmInputGroup,
    HlmInputGroupAddon,
    HlmInputGroupButton,
    HlmInputGroupTextarea,
    HlmMarker,
    HlmMarkerContent,
    HlmMessage,
    HlmMessageContent,
  ],
  providers: [provideIcons({ lucideArrowUp, lucidePenLine, lucideSparkles, lucideX })],
  templateUrl: './assistant-panel.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPanel {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * The thread, its live generation, and this panel's hold on the column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssistantStoreType}
   */
  protected readonly store: AssistantStoreType = inject<AssistantStoreType>(AssistantStore);

  /**
   * Property suggestions
   * @readonly
   *
   * @description
   * Opening prompts, offered only while the transcript is empty.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly suggestions: readonly string[] = ASSISTANT_SUGGESTIONS;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The question being written. `form()` writes through to this signal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<AssistantQuestionValues>}
   */
  protected readonly model: WritableSignal<AssistantQuestionValues> =
    signal<AssistantQuestionValues>({ question: '' });

  /**
   * Property questionForm
   * @readonly
   *
   * @description
   * The composer's schema: a question is required and capped at the length the
   * ask endpoint accepts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AssistantQuestionValues>}
   */
  protected readonly questionForm: FieldTree<AssistantQuestionValues> = form(
    this.model,
    (path): void => {
      required(path.question);
      maxLength(path.question, ASSISTANT_MAX_QUESTION_LENGTH);
    },
  );

  /**
   * Property isIntroVisible
   * @readonly
   *
   * @description
   * Whether the opening hint and its suggestion chips belong on screen: an
   * empty thread that is not merely still loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isIntroVisible: Signal<boolean> = computed(
    (): boolean => this.store.messages().length === 0 && !this.store.isLoading(),
  );

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * Whether the draft is worth sending. A generation in flight blocks it: the
   * endpoint would accept a second question, but the panel can only follow one
   * stream at a time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed(
    (): boolean =>
      this.model().question.trim().length > 0 &&
      this.questionForm.question().valid() &&
      !this.store.isAsking() &&
      !this.store.isGenerating(),
  );

  /**
   * Property status
   * @readonly
   *
   * @description
   * One short sentence describing what the panel is doing, for the
   * `role="status"` line — the whole screen-reader story for a streaming reply.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly status: Signal<string> = computed((): string => {
    if (this.store.loadError() !== null)
      return $localize`:@@workspace.assistant.status.loadFailed:The conversation could not be loaded.`;

    if (this.store.askError() !== null)
      return $localize`:@@workspace.assistant.status.askFailed:Your question could not be sent.`;

    if (this.store.isLoading())
      return $localize`:@@workspace.assistant.status.loading:Loading the conversation.`;

    if (this.store.generationStalled())
      return $localize`:@@workspace.assistant.status.stalled:The assistant has stopped answering.`;

    if (this.store.isGenerating())
      return $localize`:@@workspace.assistant.status.generating:The assistant is answering.`;

    const last: AssistantMessageOutput | undefined = this.store.messages().at(-1);

    if (!this.asked() || last === undefined || last.role === 'user') return '';

    return last.status === 'failed'
      ? $localize`:@@workspace.assistant.status.failed:The assistant could not answer.`
      : $localize`:@@workspace.assistant.status.ready:Answer ready.`;
  });

  /**
   * Property asked
   * @readonly
   *
   * @description
   * Whether a question has been asked since the panel opened. Gates the
   * "Answer ready" announcement: a thread restored from the cookie ends on a
   * completed reply, and announcing it would report that something just
   * finished when nothing has happened.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly asked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property transcript
   * @readonly
   *
   * @description
   * The scroller, pinned to the newest turn.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly transcript: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('transcript');

  /**
   * Property field
   * @readonly
   *
   * @description
   * The composer textarea, whose height follows its text.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLTextAreaElement> | undefined>}
   */
  private readonly field: Signal<ElementRef<HTMLTextAreaElement> | undefined> =
    viewChild<ElementRef<HTMLTextAreaElement>>('field');
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Keeps the transcript on the newest turn and the composer sized to its text.
   *
   * The scroll is unconditional, unlike the message thread's anchoring: an
   * assistant reply grows character by character under the reader's eyes, and a
   * transcript that stopped following it would be unreadable.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterRenderEffect((): void => {
      this.store.messages(); // Re-run on every frame, not only on a new turn.

      const element: HTMLElement = this.transcript().nativeElement;
      element.scrollTop = element.scrollHeight;
    });

    afterRenderEffect((): void => {
      const question: string = this.model().question;
      const element: HTMLTextAreaElement | undefined = this.field()?.nativeElement;

      if (element === undefined) return;

      element.style.height = 'auto';
      element.style.height = question.length === 0 ? '' : `${element.scrollHeight}px`;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method send
   * @method send
   *
   * @description
   * Asks the trimmed draft and clears the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {SubmitEvent} [event] - The form submission, when one triggered it.
   *
   * @returns {void}
   */
  protected send(event?: SubmitEvent): void {
    event?.preventDefault();

    if (!this.canSend()) return;

    this.ask(this.model().question.trim());
    this.model.set({ question: '' });
  }

  /**
   * Method askSuggestion
   * @method askSuggestion
   *
   * @description
   * Sends one of the opening prompts straight through, without routing it
   * through the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} question - The suggested prompt.
   *
   * @returns {void}
   */
  protected askSuggestion(question: string): void {
    if (this.store.isAsking() || this.store.isGenerating()) return;

    this.ask(question);
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
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.send();
  }

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Dismisses the panel with Escape — below the desktop breakpoint it covers
   * the page, and an overlay with no keyboard exit is a trap.
   *
   * Bound to the host rather than the document, so it cannot close the panel
   * from inside an unrelated dialog, and ignored while a question is
   * half-written, since throwing that away is not what anyone means by Escape.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  @HostListener('keydown.escape')
  protected onEscape(): void {
    if (this.model().question.length > 0) return;

    this.store.closePanel();
  }
  //#endregion

  //#region Internals
  /**
   * Method ask
   * @method ask
   *
   * @description
   * Sends a question and arms the "Answer ready" announcement.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} question - The question to ask.
   *
   * @returns {void}
   */
  private ask(question: string): void {
    this.asked.set(true);
    this.store.ask(question);
  }
  //#endregion
}

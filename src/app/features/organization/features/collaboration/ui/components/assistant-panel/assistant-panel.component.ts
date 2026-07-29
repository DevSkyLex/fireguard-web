import { TextFieldModule } from '@angular/cdk/text-field';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  HostListener,
  inject,
  signal,
  type Signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import type { AssistantMessageOutput } from '@features/organization/features/collaboration/models';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { WorkspaceShellService } from '@layouts/workspace-layout';
import { ASSISTANT_MAX_QUESTION_LENGTH, ASSISTANT_SUGGESTIONS } from './constants';

/**
 * Component AssistantPanel
 * @class AssistantPanel
 *
 * @description
 * The workspace's right-hand assistant: a transcript, suggestion chips while it
 * is empty, and a composer.
 *
 * Two departures from the prototype are deliberate. Its assistant answered
 * "using this thread" through a `window.claude.complete` call that does not
 * exist outside the design tool; the real endpoint is organization-scoped and
 * receives no conversation, so the copy says so rather than promising context
 * the backend never sees. And replies render as plain text with preserved
 * whitespace — the model emits Markdown, but rendering it needs a sanitizing
 * pipeline this app does not have, and injecting model output as HTML is the
 * one thing that must not be done casually.
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
  imports: [TextFieldModule, TooltipModule],
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
   * The thread, its live generation, and the panel's hold on the slot.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssistantStoreType}
   */
  protected readonly store: AssistantStoreType = inject(AssistantStore);

  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state, written only on close so the panel that was showing before
   * the assistant comes back.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  private readonly shell: WorkspaceShellService = inject(WorkspaceShellService);

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
   * Property maxLength
   * @readonly
   *
   * @description
   * Question ceiling enforced by the API.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly maxLength: number = ASSISTANT_MAX_QUESTION_LENGTH;

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
   * Property asked
   * @readonly
   *
   * @description
   * Whether a question has been asked since the panel opened.
   *
   * Gates the "Answer ready" announcement: a thread restored from the cookie
   * ends on a completed reply, and announcing it would tell the member that
   * something just finished when nothing has happened.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly asked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canSend
   * @readonly
   *
   * @description
   * Whether the draft is worth sending. A generation in flight blocks it: the
   * ask endpoint would accept a second question, but the panel can only follow
   * one stream at a time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSend: Signal<boolean> = computed((): boolean => {
    const trimmed: string = this.draft().trim();

    return (
      trimmed.length > 0 &&
      trimmed.length <= ASSISTANT_MAX_QUESTION_LENGTH &&
      !this.store.isAsking() &&
      !this.store.isGenerating()
    );
  });

  /**
   * Property status
   * @readonly
   *
   * @description
   * One short sentence describing what the panel is doing, for the `role="status"`
   * line.
   *
   * This is the whole screen-reader story for a streaming reply: the answer
   * itself is re-sent whole on every frame, so announcing the transcript would
   * restart the paragraph twenty times. Announcing the *state* instead says
   * what a sighted user gets from the spinner.
   *
   * @access protected
   * @since 1.1.0
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

    // Nothing to announce for a thread restored from a previous session: its
    // last reply arrived before the panel was even open.
    if (!this.asked() || last === undefined || last.role === 'user') return '';

    return last.status === 'failed'
      ? $localize`:@@workspace.assistant.status.failed:The assistant could not answer.`
      : $localize`:@@workspace.assistant.status.ready:Answer ready.`;
  });

  /**
   * Property transcript
   * @readonly
   *
   * @description
   * The scroller, pinned to the bottom as turns and frames arrive.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly transcript: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('transcript');
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   *
   * @description
   * Keeps the transcript scrolled to the newest turn.
   *
   * Unconditional, unlike the message thread's anchoring: an assistant reply
   * grows character by character under the member's eyes, and a transcript that
   * stopped following it would be unreadable.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterRenderEffect((): void => {
      // Read first so the effect re-runs on every frame, not only on new turns.
      this.store.messages();

      const element: HTMLElement = this.transcript().nativeElement;
      element.scrollTop = element.scrollHeight;
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Releases the slot and restores the panel the shell was showing before.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected close(): void {
    this.shell.setPanelVisible(this.store.closePanel());
  }

  /**
   * Method onEscape
   * @method onEscape
   *
   * @description
   * Dismisses the panel with Escape — below 1024px it is a full-bleed overlay,
   * and an overlay with no keyboard exit is a trap.
   *
   * Bound to the host, not the document: a document-level listener closed the
   * panel from anywhere in the app, including from inside an unrelated dialog.
   *
   * Ignored while a question is half-written: Escape there would throw it away,
   * which is not what anyone means by it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  @HostListener('keydown.escape')
  protected onEscape(): void {
    if (this.draft().length > 0) return;

    this.close();
  }

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
   * Asks the trimmed draft and clears the composer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected send(): void {
    if (!this.canSend()) return;

    this.asked.set(true);
    this.store.ask(this.draft().trim());
    this.draft.set('');
  }

  /**
   * Method ask
   * @method ask
   *
   * @description
   * Sends one of the suggestion chips straight through.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} question - The suggested prompt.
   *
   * @return {void}
   */
  protected ask(question: string): void {
    if (this.store.isAsking() || this.store.isGenerating()) return;

    this.asked.set(true);
    this.store.ask(question);
  }
  //#endregion
}

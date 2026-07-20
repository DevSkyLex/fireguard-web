import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { AssistantThreadStore } from '@features/organization/features/assistant/state';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { Skeleton } from '@shared/components';

/**
 * Component AssistantPanel
 * @class AssistantPanel
 *
 * @description
 * The assistant as a side panel beside the thread, per the design kit, rather
 * than a page of its own.
 *
 * Asking with no thread open starts one first: the previous page could only
 * open threads that already existed, so a member who had never used the
 * assistant had no way in.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-assistant-panel',
  imports: [FormsModule, ButtonModule, TextareaModule, Skeleton],
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
   * Shared assistant state — the same instance the panel and any other surface
   * read, so a thread opened here stays open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof AssistantThreadStore>}
   */
  protected readonly store: InstanceType<typeof AssistantThreadStore> =
    inject(AssistantThreadStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property draft
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draft: WritableSignal<string> = signal<string>('');

  /**
   * Property pendingQuestion
   * @readonly
   *
   * @description
   * The question typed before any thread existed. Held until the freshly
   * started thread opens, then asked — so the member never retypes it.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly pendingQuestion: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property canAsk
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  /**
   * Property suggestions
   * @readonly
   *
   * @description
   * Openers offered on an empty thread. A blank assistant is intimidating and
   * says nothing about what it can answer; these state its scope in the
   * product's own terms — sites, equipment, interventions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly suggestions: readonly string[] = [
    $localize`:@@assistant.panel.suggestion.overdue:Which equipment is overdue for inspection?`,
    $localize`:@@assistant.panel.suggestion.nonConformities:What non-conformities are still open?`,
    $localize`:@@assistant.panel.suggestion.week:What interventions are planned this week?`,
  ];

  protected readonly canAsk: Signal<boolean> = computed(
    (): boolean =>
      this.draft().trim().length > 0 && !this.store.isAnswering() && !this.store.isStartingThread(),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   *
   * @description
   * Binds the panel to the active organization, and forwards a question that
   * was waiting on a thread being created.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null =
        this.organizationContext.selectedOrganization()?.id ?? null;

      this.store.setOrganization(organizationId);
      this.store.loadThreads(organizationId);
    });

    effect((): void => {
      const threadId: string | null = this.store.startedThreadId();
      if (threadId === null) return;

      this.store.clearStartedThread();
      this.store.openThread(threadId);

      const question: string | null = this.pendingQuestion();
      if (question === null) return;

      this.pendingQuestion.set(null);
      this.store.ask(question);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method ask
   *
   * @description
   * Sends the question, starting a thread first when none is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected ask(): void {
    if (!this.canAsk()) return;

    const question: string = this.draft().trim();
    this.draft.set('');

    if (this.store.activeThreadId() === null) {
      this.pendingQuestion.set(question);
      this.store.startThread(null);
      return;
    }

    this.store.ask(question);
  }

  /**
   * Method startNewThread
   *
   * @description
   * Opens a fresh thread, leaving the current one in the list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  /**
   * Method useSuggestion
   *
   * @description
   * Sends a suggested opener straight away. Dropping it into the field instead
   * would ask the member to confirm a sentence they did not write.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} suggestion - The chosen opener.
   *
   * @returns {void}
   */
  protected useSuggestion(suggestion: string): void {
    this.draft.set(suggestion);
    this.ask();
  }

  protected startNewThread(): void {
    this.pendingQuestion.set(null);
    this.store.startThread(null);
  }

  /**
   * Method onComposerKeydown
   *
   * @description
   * Enter asks, Shift+Enter breaks the line.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The key press.
   *
   * @returns {void}
   */
  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    this.ask();
  }
  //#endregion
}

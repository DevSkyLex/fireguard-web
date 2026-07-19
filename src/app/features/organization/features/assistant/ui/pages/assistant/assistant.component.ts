import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import {
  AssistantThreadStore,
  type AssistantThreadStoreType,
} from '@features/organization/features/assistant/state';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState, Skeleton } from '@shared/components';

/**
 * Component AssistantPage
 * @class AssistantPage
 *
 * @description
 * The organization assistant: past threads on the left, the open conversation
 * and its composer on the right.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-assistant',
  imports: [FormsModule, ButtonModule, TextareaModule, EmptyState, Skeleton],
  providers: [AssistantThreadStore],
  host: { class: 'flex min-h-0 flex-1' },
  templateUrl: './assistant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssistantThreadStoreType}
   */
  protected readonly store: AssistantThreadStoreType =
    inject<AssistantThreadStoreType>(AssistantThreadStore);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property draft
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draft: WritableSignal<string> = signal<string>('');

  /**
   * Property canAsk
   * @readonly
   *
   * @description
   * A question can only be asked into an open thread, and never while the
   * previous answer is still being produced.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAsk: Signal<boolean> = computed(
    (): boolean =>
      this.draft().trim().length > 0 &&
      !this.store.isAnswering() &&
      this.store.activeThreadId() !== null,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the member's threads for the active organization.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null =
        this.activeOrganizationStore.selectedOrganization()?.id ?? null;

      untracked((): void => {
        if (organizationId === this.store.organizationId()) return;
        this.store.setOrganization(organizationId);
        this.store.loadThreads(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openThread
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} threadId - The thread to open.
   *
   * @returns {void}
   */
  protected openThread(threadId: string): void {
    this.draft.set('');
    this.store.openThread(threadId);
  }

  /**
   * Method ask
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected ask(): void {
    if (!this.canAsk()) return;

    this.store.ask(this.draft());
    this.draft.set('');
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
   * @param {KeyboardEvent} event - The keydown event.
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

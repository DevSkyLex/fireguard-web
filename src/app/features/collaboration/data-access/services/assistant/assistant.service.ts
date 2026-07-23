import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type {
  AskAssistantQuestionInput,
  AskAssistantQuestionOutput,
  AssistantSubscriptionOutput,
  AssistantThreadDetailOutput,
  AssistantThreadOutput,
} from '@features/collaboration/models';

/**
 * Largest message page the thread read accepts. Asking for more silently
 * returns 200, so the ceiling has to be respected client-side.
 */
export const ASSISTANT_MESSAGES_PAGE_SIZE = 50;

/**
 * Service AssistantService
 * @class AssistantService
 * @extends {HydraApiService}
 *
 * @description
 * Transport boundary for the AI assistant.
 *
 * The surface is deliberately narrower than the API's. `model` is never sent:
 * it is validated against an operator allowlist that is not exposed by any
 * endpoint, an unknown value is a `422`, and generation ignores it anyway.
 * `temperature` is never sent either. There is nothing to rename, archive or
 * delete a thread with, and no cancel or retry — so none of that is wrapped.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class AssistantService extends HydraApiService {
  //#region Methods
  /**
   * Method startThread
   * @method startThread
   *
   * @description
   * Opens a thread. The body is empty on purpose — a first question cannot be
   * seeded here and must follow as its own call.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Bare organization UUID.
   *
   * @returns {Observable<AssistantThreadOutput>} The created thread.
   */
  public startThread(organizationId: string): Observable<AssistantThreadOutput> {
    return this.post<Record<string, never>, AssistantThreadOutput>(
      this.threadsEndpoint(organizationId),
      {},
    );
  }

  /**
   * Method getThread
   * @method getThread
   *
   * @description
   * Reads a thread and one page of its messages.
   *
   * Messages come back oldest-first with a plain offset, so `page` 1 is the
   * beginning of the conversation. Callers wanting the tail read
   * `messagesTotal` first.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Bare organization UUID.
   * @param {string} threadId - Bare thread UUID.
   * @param {number} [page] - Message page, 1-based. Defaults to the first.
   *
   * @returns {Observable<AssistantThreadDetailOutput>} The thread and one message page.
   */
  public getThread(
    organizationId: string,
    threadId: string,
    page?: number,
  ): Observable<AssistantThreadDetailOutput> {
    return this.getOne<AssistantThreadDetailOutput>(
      `${this.threadsEndpoint(organizationId)}/${threadId}`,
      {
        params: {
          messagesPage: page ?? 1,
          messagesItemsPerPage: ASSISTANT_MESSAGES_PAGE_SIZE,
        },
      },
    );
  }

  /**
   * Method ask
   * @method ask
   *
   * @description
   * Asks a question. Answers `201` immediately with the reply left `pending`;
   * the text arrives over Mercure, never in this response.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Bare organization UUID.
   * @param {string} threadId - Bare thread UUID.
   * @param {AskAssistantQuestionInput} input - The question.
   *
   * @returns {Observable<AskAssistantQuestionOutput>} Both created turns.
   */
  public ask(
    organizationId: string,
    threadId: string,
    input: AskAssistantQuestionInput,
  ): Observable<AskAssistantQuestionOutput> {
    return this.post<AskAssistantQuestionInput, AskAssistantQuestionOutput>(
      `${this.threadsEndpoint(organizationId)}/${threadId}/messages`,
      input,
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Mints credentials for the thread's Mercure topic.
   *
   * The token expires after 900 seconds and nothing renews it, so a long-lived
   * panel has to call this again before then.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Bare organization UUID.
   * @param {string} threadId - Bare thread UUID.
   *
   * @returns {Observable<AssistantSubscriptionOutput>} Topic and subscriber token.
   */
  public getSubscription(
    organizationId: string,
    threadId: string,
  ): Observable<AssistantSubscriptionOutput> {
    return this.getOne<AssistantSubscriptionOutput>(
      `${this.threadsEndpoint(organizationId)}/${threadId}/subscription`,
    );
  }
  //#endregion

  //#region Internals
  /**
   * Method threadsEndpoint
   * @method threadsEndpoint
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Bare organization UUID.
   *
   * @return {string} The organization-scoped threads collection path.
   */
  private threadsEndpoint(organizationId: string): string {
    return `/api/organizations/${organizationId}/assistant/threads`;
  }
  //#endregion
}

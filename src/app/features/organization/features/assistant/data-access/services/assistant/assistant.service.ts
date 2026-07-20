import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { MercureSubscriptionOutput } from '@core/mercure';
import type {
  AskAssistantOutput,
  AssistantThread,
} from '@features/organization/features/assistant/models';

/**
 * Service AssistantService
 * @class AssistantService
 * @extends {HydraApiService}
 *
 * @description
 * Transport for the organization assistant: threads, their messages, and the
 * Mercure subscription an answer streams over.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class AssistantService extends HydraApiService {
  //#region Public Methods
  /**
   * Method listThreads
   * @method listThreads
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization.
   *
   * @return {Observable<HydraCollection<AssistantThread>>} The member's threads.
   */
  public listThreads(organizationId: string): Observable<HydraCollection<AssistantThread>> {
    return this.getCollection<AssistantThread>(
      `/api/organizations/${organizationId}/assistant/threads`,
    );
  }

  /**
   * Method getThread
   * @method getThread
   *
   * @description
   * Reads one page of a thread's messages, oldest first. The API caps a page at
   * 50 messages, so a caller that never asks for page 2 silently sees only the
   * opening of a long conversation.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} organizationId - The organization.
   * @param {string} threadId - The thread to read.
   * @param {number} messagesPage - 1-based page of messages to read.
   *
   * @return {Observable<AssistantThread>} The thread with that page of messages.
   */
  public getThread(
    organizationId: string,
    threadId: string,
    messagesPage = 1,
  ): Observable<AssistantThread> {
    return this.getOne<AssistantThread>(
      `/api/organizations/${organizationId}/assistant/threads/${threadId}`,
      { params: { messagesPage } },
    );
  }

  /**
   * Method ask
   * @method ask
   *
   * @description
   * Posts a question. The answer comes back `pending` and fills in over
   * Mercure, so callers must not treat an empty body as a failure.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization.
   * @param {string} threadId - The thread to ask in.
   * @param {string} body - The question.
   *
   * @return {Observable<AskAssistantOutput>} The question and the answer being produced.
   */
  public ask(
    organizationId: string,
    threadId: string,
    body: string,
  ): Observable<AskAssistantOutput> {
    return this.post<{ body: string }, AskAssistantOutput>(
      `/api/organizations/${organizationId}/assistant/threads/${threadId}/messages`,
      { body },
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Issues a short-lived Mercure token for one thread; re-request it per
   * reconnection attempt rather than replaying it.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization.
   * @param {string} threadId - The thread to follow.
   *
   * @return {Observable<MercureSubscriptionOutput>} The topic and token.
   */
  public getSubscription(
    organizationId: string,
    threadId: string,
  ): Observable<MercureSubscriptionOutput> {
    return this.getOne<MercureSubscriptionOutput>(
      `/api/organizations/${organizationId}/assistant/threads/${threadId}/subscription`,
    );
  }
  //#endregion
}

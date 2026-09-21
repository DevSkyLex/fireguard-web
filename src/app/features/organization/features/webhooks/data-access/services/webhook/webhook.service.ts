import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  WebhookSubscriptionOutput,
  WebhookSecretOutput,
  WebhookSubscriptionInput,
  WebhookDeliveryOutput,
  WebhookPingOutput,
  WebhookEventOutput,
  WebhookMutation,
} from '@features/organization/features/webhooks/models';

/**
 * Service WebhookService
 * @class WebhookService
 * @description Organization-owned webhook transport. Plaintext secrets are returned only by create and rotation.
 * @since 1.0.0
 */
@Service()
export class WebhookService extends HydraApiService {
  /**
   * Method list
   * @method list
   * @description Lists a server page of subscriptions.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization scope.
   * @param {number} page - One-based page.
   * @returns {Observable<HydraCollection<WebhookSubscriptionOutput>>} API response.
   */
  public list(
    organizationId: string,
    page: number,
  ): Observable<HydraCollection<WebhookSubscriptionOutput>> {
    return this.getCollection<WebhookSubscriptionOutput>(
      `/api/organizations/${organizationId}/webhooks`,
      { page, itemsPerPage: 20 },
    );
  }
  /**
   * Method events
   * @method events
   * @description Reads the public event catalog.
   * @access public
   * @since 1.0.0
   * @returns {Observable<HydraCollection<WebhookEventOutput>>} API response.
   */
  public events(): Observable<HydraCollection<WebhookEventOutput>> {
    return this.getCollection<WebhookEventOutput>('/api/webhooks/event-types');
  }
  /**
   * Method deliveries
   * @method deliveries
   * @description Lists durable delivery outcomes using server pagination.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization scope.
   * @param {string} id - Subscription identity.
   * @param {number} page - One-based page.
   * @param {WebhookDeliveryOutput['status'] | ''} status - Optional status filter.
   * @returns {Observable<HydraCollection<WebhookDeliveryOutput>>} API response.
   */
  public deliveries(
    organizationId: string,
    id: string,
    page: number,
    status: WebhookDeliveryOutput['status'] | '',
  ): Observable<HydraCollection<WebhookDeliveryOutput>> {
    return this.getCollection<WebhookDeliveryOutput>(
      `/api/organizations/${organizationId}/webhooks/${id}/deliveries`,
      { page, itemsPerPage: 20, params: status ? { status } : {} },
    );
  }
  /**
   * Method mutate
   * @method mutate
   * @description Sends one explicit management action without automatic retries.
   * @access public
   * @since 1.0.0
   * @param {string} organizationId - Organization scope.
   * @param {WebhookMutation} action - Requested mutation.
   * @returns {Observable<WebhookSubscriptionOutput | WebhookSecretOutput | WebhookPingOutput | void>} API response.
   */
  public mutate(
    organizationId: string,
    action: WebhookMutation,
  ): Observable<WebhookSubscriptionOutput | WebhookSecretOutput | WebhookPingOutput | void> {
    const root = `/api/organizations/${organizationId}/webhooks`;
    if (action.kind === 'create') {
      const { url, description, eventTypes } = action.input;
      return this.post<WebhookSubscriptionInput, WebhookSecretOutput>(root, {
        url,
        description,
        eventTypes,
      });
    }
    const endpoint = `${root}/${action.id}`;
    switch (action.kind) {
      case 'update':
        return this.patch<Partial<WebhookSubscriptionInput>, WebhookSubscriptionOutput>(
          endpoint,
          action.input,
        );
      case 'delete':
        return this.delete(endpoint);
      case 'rotate':
        return this.postAction<WebhookSecretOutput>(`${endpoint}/rotate-secret`);
      case 'ping':
        return this.postAction<WebhookPingOutput>(`${endpoint}/ping`);
      case 'redeliver':
        return this.postAction<WebhookPingOutput>(
          `${endpoint}/deliveries/${action.deliveryId}/redeliver`,
        );
    }
  }
}

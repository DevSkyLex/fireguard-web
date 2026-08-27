import type { CallState } from '@core/request-state';
import type { NotificationPreferenceOutput } from '@features/account/models';

/**
 * Interface AccountNotificationPreferencesState
 * @interface AccountNotificationPreferencesState
 *
 * @description
 * State of the notification preferences screen. Two independent calls, so two
 * named `CallState` fields: `loadCallState` holds the canonical customized
 * set (refreshed by a successful save, since the `PATCH` answers with the
 * full set), `saveCallState` reports the in-flight upsert.
 *
 * @since 1.0.0
 */
export interface AccountNotificationPreferencesState {
  /**
   * Property loadCallState
   *
   * @description
   * Request state of the initial `GET`, carrying the canonical customized
   * preference rows. A category absent from the data is enabled on every
   * channel.
   *
   * @type {CallState<ReadonlyArray<NotificationPreferenceOutput>>}
   */
  readonly loadCallState: CallState<ReadonlyArray<NotificationPreferenceOutput>>;

  /**
   * Property saveCallState
   *
   * @description
   * Request state of the latest `PATCH` upsert.
   *
   * @type {CallState<ReadonlyArray<NotificationPreferenceOutput>>}
   */
  readonly saveCallState: CallState<ReadonlyArray<NotificationPreferenceOutput>>;
}

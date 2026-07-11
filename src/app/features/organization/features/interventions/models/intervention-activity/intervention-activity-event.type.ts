/**
 * Type InterventionActivityEvent
 *
 * @description
 * Specific event an activity entry records. `status_changed` carries an
 * `InterventionStatusChangePayload` in `payload`; the others carry no
 * structured payload beyond `body`.
 */
export type InterventionActivityEvent = 'comment' | 'created' | 'status_changed';

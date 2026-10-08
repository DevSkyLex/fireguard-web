import type { ConvertServiceRequestInput, ServiceRequestOutput } from '../index';

/**
 * Interface ServiceRequestConversionCommand
 * @interface ServiceRequestConversionCommand
 *
 * @description
 * Account-bound immutable conversion journal entry retaining its original request revision and
 * UUID.
 */
export interface ServiceRequestConversionCommand {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Only conversion has a server-supported replay identity.
   *
   * @type {'convert'}
   */
  readonly kind: 'convert';

  /**
   * Property userId
   * @readonly
   *
   * @description
   * Account that accepted this conversion; no credentials are stored.
   *
   * @type {string}
   */
  readonly userId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Original organization authority, never rebound on retry.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property request
   * @readonly
   *
   * @description
   * Captured request identity and revision used by the original command.
   *
   * @type {ServiceRequestOutput}
   */
  readonly request: ServiceRequestOutput;

  /**
   * Property input
   * @readonly
   *
   * @description
   * Exact operation UUID and selected work tuple submitted to the server.
   *
   * @type {ConvertServiceRequestInput}
   */
  readonly input: ConvertServiceRequestInput;
}

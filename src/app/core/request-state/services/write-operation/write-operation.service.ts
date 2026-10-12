import { Service } from '@angular/core';
import type { TrackedWriteOperation } from '../../models/tracked-write-operation.interface';
import type { WriteOperationTracker } from '../../models/write-operation-tracker.interface';
import type { WriteOperation } from '../../models/write-operation.interface';

/**
 * Service WriteOperationService
 * @class WriteOperationService
 *
 * @description
 * Creates independent write identities without retaining credentials, payloads or cross-request
 * state. Call once for a new intention and retain its result for an unchanged retry.
 */
@Service()
export class WriteOperationService {
  //#region Methods
  /**
   * Method create
   * @method create
   *
   * @description
   * Mints a UUID at invocation time, before any cold observable can be subscribed.
   *
   * @access public
   * @since unreleased
   *
   * @returns {WriteOperation} An immutable identity for one write intention.
   */
  public create(): WriteOperation {
    return Object.freeze({ idempotencyKey: crypto.randomUUID() });
  }

  /**
   * Method createTracker
   * @method createTracker
   *
   * @description
   * Creates a separate map for one caller's JSON intentions. The factory retains no tracker,
   * payload or operation, including across SSR requests.
   *
   * @access public
   * @since unreleased
   *
   * @returns {WriteOperationTracker} Caller-owned retry identities with explicit disposal.
   */
  public createTracker(): WriteOperationTracker {
    const intentions = new Map<string, TrackedWriteOperation>();
    return {
      options: (action, payload, scope): WriteOperation => {
        const serialized = this.serializePayload(payload);
        const previous = intentions.get(action);
        if (previous?.scope === scope && previous.payload === serialized) return previous.operation;
        const operation = this.create();
        intentions.set(action, { scope, payload: serialized, operation });
        return operation;
      },
      complete: (action): void => {
        intentions.delete(action);
      },
      clear: (): void => {
        intentions.clear();
      },
    };
  }

  /**
   * Method serializePayload
   * @method serializePayload
   *
   * @description
   * Canonicalizes the JSON wire representation without changing array order or omitting values
   * that JSON would transmit. Binary inputs require explicit caller-owned write identities.
   *
   * @access private
   * @since unreleased
   *
   * @param {unknown} payload - JSON transport input.
   *
   * @returns {string | undefined} Canonical in-memory representation only.
   */
  private serializePayload(payload: unknown): string | undefined {
    return JSON.stringify(payload, (_key, value: unknown): unknown => {
      if (value instanceof Blob || value instanceof FormData)
        throw new TypeError('Upload intentions require an explicit WriteOperation.');
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .toSorted((left, right) => {
            if (left < right) return -1;
            return left > right ? 1 : 0;
          })
          .map((key) => [key, record[key]]),
      );
    });
  }
  //#endregion
}

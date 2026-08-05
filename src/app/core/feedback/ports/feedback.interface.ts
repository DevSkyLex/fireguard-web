import type { Signal } from '@angular/core';
import type { FeedbackMessage } from '../models';

/**
 * FeedbackPort
 * @interface FeedbackPort
 *
 * @description
 * Core-owned contract for reading and clearing the app-wide feedback queue.
 * Shared presentation injects this instead of the concrete `FeedbackService`,
 * so `shared` never depends on a core implementation (`ARCHITECTURE.md` §8.5).
 *
 * It is deliberately read-and-dismiss only: producing feedback stays with the
 * stores, which dispatch it as events.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FeedbackPort {
  /**
   * Property messages
   *
   * @description
   * The pending messages, oldest first.
   *
   * @type {Signal<readonly FeedbackMessage[]>}
   */
  readonly messages: Signal<readonly FeedbackMessage[]>;

  /**
   * Method dismiss
   *
   * @description
   * Drops one message from the queue once its presentation has taken it over.
   *
   * @param {number} id - The message to drop.
   *
   * @returns {void}
   */
  dismiss(id: number): void;
}

/**
 * Type HydraContext
 * @type {HydraContext}
 *
 * @description
 * Represents the JSON-LD @context field in Hydra responses.
 * Can be a simple string URI or a detailed context object.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // Simple string context
 * const context: HydraContext = '/api/contexts/User';
 *
 * // Detailed context object
 * const context: HydraContext = {
 *   '@vocab': 'https://example.com/api#',
 *   'hydra': 'http://www.w3.org/ns/hydra/core#'
 * };
 * ```
 */
export type HydraContext = string | {
  readonly '@vocab': string;
  readonly hydra: 'http://www.w3.org/ns/hydra/core#';
  readonly [key: string]: unknown;
};

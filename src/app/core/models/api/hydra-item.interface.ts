import type { HydraContext } from './hydra-context.type';

/**
 * Interface HydraItem
 * @interface HydraItem
 *
 * @description
 * Base interface for all Hydra JSON-LD item responses.
 * All API single-item responses extend this interface.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * interface User extends HydraItem {
 *   readonly id: string;
 *   readonly email: string;
 *   readonly name: string;
 * }
 *
 * const user: User = {
 *   '@id': '/api/users/123',
 *   '@type': 'User',
 *   id: '123',
 *   email: 'john@example.com',
 *   name: 'John Doe'
 * };
 * ```
 */
export interface HydraItem {
  /**
   * Property @context
   * @readonly
   *
   * @description
   * JSON-LD context defining the vocabulary and term mappings.
   * Optional in nested items, usually present in root responses.
   *
   * @since 1.0.0
   *
   * @type {HydraContext | undefined}
   */
  readonly '@context'?: HydraContext;

  /**
   * Property @id
   * @readonly
   *
   * @description
   * IRI (Internationalized Resource Identifier) of the resource.
   * Unique identifier in the format '/api/resource/{id}'.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@id': string;

  /**
   * Property @type
   * @readonly
   *
   * @description
   * Type of the resource as defined in the JSON-LD vocabulary.
   * Corresponds to the entity class name (e.g., 'User', 'Session').
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly '@type': string;
}

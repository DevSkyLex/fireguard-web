/**
 * API Models - Hydra/JSON-LD
 *
 * @description
 * Generic interfaces for Hydra/JSON-LD API responses.
 * These types are used as base for all domain-specific models.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

// Types
export type { HydraContext } from './hydra-context.type';

// Interfaces
export type { HydraItem } from './hydra-item.interface';
export type { HydraView } from './hydra-view.interface';
export type { HydraSearch, HydraSearchMapping } from './hydra-search.interface';
export type { HydraCollection } from './hydra-collection.interface';
export type { ApiError } from './api-error.interface';
export type { ConstraintViolation, Violation } from './constraint-violation.interface';

// Type guards
export { isApiError } from './api-error.interface';
export { isConstraintViolation } from './constraint-violation.interface';

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';

/**
 * Provider provideMainFeature
 *
 * @description
 * Provides the main feature.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideMainFeature()
 * ```
 */
export function provideMainFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([]);
}

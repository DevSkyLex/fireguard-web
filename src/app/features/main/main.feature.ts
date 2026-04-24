import { makeEnvironmentProviders, type EnvironmentProviders, type Provider } from '@angular/core';

/**
 * Interface MainFeature
 *
 * @description
 * Represents an optional feature that can be composed into `provideMainFeature()`.
 * Follows the Angular `RouterFeature` / `HttpClientFeature` pattern where `with*`
 * functions return a feature object that is spread into the provider list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MainFeature {
  providers: Provider[];
}

/**
 * Provider provideMainFeature
 *
 * @description
 * Provides the main feature. Accepts optional `MainFeature` objects
 * (e.g. `withMainNavigation()`) to compose additional providers into
 * the environment.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideMainFeature(withMainNavigation())
 * ```
 */
export function provideMainFeature(...features: MainFeature[]): EnvironmentProviders {
  return makeEnvironmentProviders([...features.flatMap((f) => f.providers)]);
}

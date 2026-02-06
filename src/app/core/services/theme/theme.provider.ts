import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { ThemeService } from './theme.service';

/**
 * Provider provideTheme
 *
 * @description
 * Provides the ThemeService and initializes it on application startup.
 * This ensures the theme is applied as early as possible to prevent
 * flash of unstyled content (FOUC).
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideTheme(),
 *   ]
 * };
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      // Inject ThemeService to trigger initialization
      inject<ThemeService>(ThemeService);
    }),
  ]);
}

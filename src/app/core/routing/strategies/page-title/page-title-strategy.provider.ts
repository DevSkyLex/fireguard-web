import type { Provider } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { PageTitleStrategy } from './page-title.strategy';

/**
 * Provider providePageTitleStrategy
 *
 * @description
 * Provider that provides the custom PageTitleStrategy
 * as the TitleStrategy.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     providePageTitleStrategy()
 *   ]
 * };
 * ```
 */
export function providePageTitleStrategy(): Provider {
  return {
    provide: TitleStrategy,
    useClass: PageTitleStrategy,
  };
}

import { vi } from 'vitest';

/**
 * Function installMatchMediaMock
 *
 * @description
 * Installs a `window.matchMedia` stub for specs running under the vitest DOM
 * environment, where the API is missing. Every query resolves to
 * `matches: false` with inert listener hooks, which is enough for components
 * that only probe media queries (responsive layouts, reduced motion).
 *
 * Call it once in `beforeEach` before creating the component under test.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {void}
 */
export function installMatchMediaMock(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(
      (query: string): MediaQueryList =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    ),
  });
}

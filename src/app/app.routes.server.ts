import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Constant serverRoutes
 *
 * @description
 * Per-route SSR rendering mode configuration.
 *
 * - `auth/**` and `onboarding/**` use `RenderMode.Server`: these are public or
 *   early-auth pages that benefit from server-side rendering and do not contain
 *   DOM-dependent overlay components. Onboarding already uses TransferState to
 *   prevent duplicate authenticated requests after hydration.
 *
 * - All other routes (`**`) use `RenderMode.Client`: the dashboard shell and
 *   feature pages require authentication tokens, depend on PrimeNG overlay
 *   components (menus, popovers) that need `document`/`window`, and use
 *   authenticated HTTP calls that are intentionally excluded from the HTTP
 *   Transfer Cache (`withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: false })`).
 *   Server-rendering these routes would cause double HTTP requests and hydration
 *   mismatches on every page load.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'auth/**',
    renderMode: RenderMode.Server,
  },
  {
    path: 'onboarding/**',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];

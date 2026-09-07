import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Constant serverRoutes
 *
 * @description
 * Per-route SSR rendering mode configuration.
 *
 * - The federated sign-in callback uses `RenderMode.Client`: it owns a one-time
 *   provider code and completes the exchange in the browser before handing the
 *   result to `AuthStore`. Rendering it on the server would split that single
 *   workflow across two runtimes.
 *
 * - The remaining `auth/**` routes use `RenderMode.Server`: these public and
 *   early-auth pages benefit from server-side rendering and do not contain
 *   DOM-dependent overlay components.
 *
 * - `onboarding/**` remains server-rendered and uses its feature-owned
 *   TransferState handoff to avoid a duplicate authenticated request during
 *   hydration.
 *
 * - All other routes (`**`) use `RenderMode.Client`: the dashboard shell and
 *   feature pages require authentication tokens, depend on overlay components
 *   that need `document`/`window`, and use
 *   authenticated HTTP calls that are intentionally excluded from the HTTP
 *   Transfer Cache (`withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: false })`).
 *   Server-rendering these routes would cause double HTTP requests and hydration
 *   mismatches on every page load.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'auth/federated/:provider/callback',
    renderMode: RenderMode.Client,
  },
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

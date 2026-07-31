import { join } from 'node:path';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { LANG_COOKIE_NAME } from './app/core/locale/constants/app-locale.constants';
import {
  isSupportedLocale,
  parseCookieHeader,
  resolveLocaleFromRequest,
} from './app/core/locale/utils';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Baseline security headers, applied to every response including static assets.
 *
 * `frame-ancestors` duplicates `X-Frame-Options` on purpose: the modern directive
 * is the one browsers honour, the legacy header covers the rest. Framing an
 * identity provider is how consent and session UI get hijacked, so both say no.
 *
 * Deliberately no `script-src`/`style-src` policy here: Angular's hydration and
 * PrimeNG's runtime styling need a nonce pipeline to work under a strict CSP, and
 * a half-configured policy either breaks the app or lulls you into thinking it is
 * protected. That belongs in its own change, verified in a browser.
 */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Everything past the static handler is server-rendered HTML built for one
 * signed-in member: their organization, their name, their notifications.
 *
 * Without this it carries no cache directive at all, which leaves any shared
 * proxy free to apply its own heuristics and hand one member's page to the next
 * visitor. Hashed assets above keep their long max-age; only the rendered
 * document is marked uncacheable.
 */
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  next();
});

/**
 * Bias locale resolution toward the explicit `lang` cookie.
 *
 * `@angular/ssr` resolves the locale natively: it serves the bundle matching the
 * URL sub-path and, for the base path in a multi-locale build, redirects by
 * `Accept-Language`. It does not read cookies, so an explicit persisted choice
 * would lose to the browser language. Promoting the cookie locale to the front
 * of `Accept-Language` makes the engine's own redirect honor it, without
 * duplicating any locale-serving logic here. No-op when the cookie is absent or
 * unsupported (including every single-locale dev build).
 */
app.use((req, _res, next) => {
  const cookieLocale = parseCookieHeader(req.headers.cookie)[LANG_COOKIE_NAME];
  if (isSupportedLocale(cookieLocale)) {
    const accepted = req.headers['accept-language'];
    req.headers['accept-language'] = accepted ? `${cookieLocale},${accepted}` : cookieLocale;
  }

  next();
});

/**
 * Render with the Angular SSR engine, which serves the locale bundle matching
 * the URL and redirects the base path by (cookie-biased) `Accept-Language`.
 *
 * In a multi-locale build a locale-less deep link (e.g. `/dashboard`) matches no
 * entry point, so `handle` returns `null`: redirect it under the resolved locale
 * so bookmarks and external links land on a localized route. A single-locale
 * (dev) build serves every route from its one entry point and never reaches this
 * branch, so no locale prefix is ever forced there.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (response) return writeResponseToNodeResponse(response, res);

      const isNavigation = req.method === 'GET' || req.method === 'HEAD';
      if (!isNavigation || req.path.includes('.') || isSupportedLocale(req.path.split('/')[1])) {
        return next();
      }

      const locale = resolveLocaleFromRequest(req.headers.cookie, req.headers['accept-language']);
      const suffix = req.originalUrl === '/' ? '/' : req.originalUrl;
      res.redirect(302, `/${locale}${suffix}`);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

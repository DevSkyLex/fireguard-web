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
} from './app/core/locale/utils/locale-resolution.utils';

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

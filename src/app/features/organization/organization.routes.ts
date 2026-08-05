import type { Routes } from '@angular/router';

/**
 * Constant ORGANIZATION_ROUTES
 *
 * @description
 * Everything served under an organization: this feature's own pages and its
 * nested subfeatures, each mounted through its own lazy route file.
 *
 * Empty for now — the interface layer was removed, so there is no page left to
 * mount. The constant stays as the feature's route entry point, which the app
 * shell wires back up once screens exist again.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_ROUTES: Routes = [];

import { InjectionToken } from '@angular/core';
import type { PageHeaderContribution } from './page-header-contribution.interface';

/**
 * Constant WORKSPACE_PAGE_HEADER_SLOT
 * @const WORKSPACE_PAGE_HEADER_SLOT
 *
 * @description
 * Multi-provider injection token collecting every action registered for the
 * workspace page-header slot.
 *
 * Named with a `WORKSPACE_` prefix because the dashboard layout already
 * publishes a `PAGE_HEADER_SLOT`: the two shells coexist, and a route that
 * mounts both providers must not have its contributions collide.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<PageHeaderContribution[]>}
 */
export const WORKSPACE_PAGE_HEADER_SLOT: InjectionToken<PageHeaderContribution[]> =
  new InjectionToken<PageHeaderContribution[]>('WORKSPACE_PAGE_HEADER_SLOT');

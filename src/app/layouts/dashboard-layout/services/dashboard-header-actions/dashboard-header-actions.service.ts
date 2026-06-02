import { inject, Injectable, type Type } from '@angular/core';
import { TOPBAR_SLOT } from '@layouts/dashboard-layout/slots/topbar';
import type { TopbarContribution } from '@layouts/dashboard-layout/slots/topbar';

/**
 * Service DashboardHeaderActionsService
 * @class DashboardHeaderActionsService
 *
 * @description
 * Layout-scoped service aggregating header action contributions
 * registered via the `TOPBAR_SLOT` multi-provider token
 * and exposing them as a sorted list of component types.
 *
 * The service is contribution-agnostic: it sorts contributions by their
 * `order` property and exposes the resulting `Type<unknown>[]` for the
 * header template to render via `NgComponentOutlet`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardHeaderActionsService {
  //#region Properties

  /**
   * Property actions
   * @readonly
   *
   * @description
   * Sorted list of header action contributions.
   *
   * @access public
   * @since 1.4.0
   *
   * @type {TopbarContribution[]}
   */
  public readonly actions: TopbarContribution[] = (
    inject(TOPBAR_SLOT, { optional: true }) ?? []
  ).toSorted(
    (a: TopbarContribution, b: TopbarContribution): number => a.order - b.order,
  );

  /**
   * Property components
   * @readonly
   *
   * @description
   * Sorted list of header action component types, ready to be rendered
   * via `NgComponentOutlet`. Sorted by ascending `order`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Type<unknown>[]}
   */
  public readonly components: Type<unknown>[] = this.actions.map(
    (contribution: TopbarContribution): Type<unknown> => contribution.component,
  );

  //#endregion
}


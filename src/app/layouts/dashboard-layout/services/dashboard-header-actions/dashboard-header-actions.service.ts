import { inject, Injectable, type Type } from '@angular/core';
import { HEADER_ACTION_SLOT } from '@layouts/dashboard-layout/slots/header-action';
import type { HeaderActionContribution } from '@layouts/dashboard-layout/slots/header-action';

/**
 * Service DashboardHeaderActionsService
 * @class DashboardHeaderActionsService
 *
 * @description
 * Layout-scoped service aggregating header action contributions
 * registered via the `HEADER_ACTION_SLOT` multi-provider token
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
  public readonly components: Type<unknown>[] = (
    inject(HEADER_ACTION_SLOT, { optional: true }) ?? []
  )
    .toSorted(
      (a: HeaderActionContribution, b: HeaderActionContribution): number => a.order - b.order,
    )
    .map((contribution: HeaderActionContribution): Type<unknown> => contribution.component);

  //#endregion
}

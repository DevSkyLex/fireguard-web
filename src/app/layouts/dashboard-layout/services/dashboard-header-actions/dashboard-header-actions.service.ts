import { computed, inject, Injectable, type Signal } from '@angular/core';
import { TOPBAR_SLOT } from '@layouts/dashboard-layout/slots/topbar';
import type { TopbarContribution } from '@layouts/dashboard-layout/slots/topbar';

/**
 * Service DashboardHeaderActionsService
 * @class DashboardHeaderActionsService
 *
 * @description
 * Layout-scoped service aggregating header action contributions registered via
 * the `TOPBAR_SLOT` multi-provider token.
 *
 * Registration is resolved once — a multi-provider array is immutable per
 * injector, so a contribution can never appear or disappear at runtime — and
 * visibility is filtered reactively on each contribution's `available` signal.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardHeaderActionsService {
  //#region Properties

  /**
   * Property registered
   * @readonly
   *
   * @description
   * Every contribution, sorted by ascending `order`. Resolved at construction.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {readonly TopbarContribution[]}
   */
  private readonly registered: readonly TopbarContribution[] = (
    inject(TOPBAR_SLOT, { optional: true }) ?? []
  ).toSorted((a: TopbarContribution, b: TopbarContribution): number => a.order - b.order);

  /**
   * Property actions
   * @readonly
   *
   * @description
   * The contributions that currently apply, in order.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<readonly TopbarContribution[]>}
   */
  public readonly actions: Signal<readonly TopbarContribution[]> = computed(
    (): readonly TopbarContribution[] =>
      this.registered.filter(
        (contribution: TopbarContribution): boolean => contribution.available?.() ?? true,
      ),
  );

  //#endregion
}

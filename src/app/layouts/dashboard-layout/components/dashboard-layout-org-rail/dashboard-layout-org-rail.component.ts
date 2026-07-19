import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SIDEBAR_SLOT, type SidebarContribution } from '@layouts/dashboard-layout/slots/sidebar';
import { Logo } from '@shared/components';

/**
 * Component DashboardLayoutOrgRail
 * @class DashboardLayoutOrgRail
 *
 * @description
 * The persistent organization rail on the far left of the shell: brand mark on
 * top, then the widgets contributed to `SIDEBAR_SLOT` region `'rail'` — today
 * only the organization switcher.
 *
 * It is chrome, not navigation: it never collapses, and it stays visible while
 * the channel sidebar is hidden. Below the tablet breakpoint the whole rail is
 * hidden and its contents move into the mobile drawer.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-org-rail/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-org-rail',
  imports: [NgComponentOutlet, RouterLink, Logo],
  templateUrl: './dashboard-layout-org-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutOrgRail {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * Every rail widget, sorted by `order`. Resolved once — a multi-provider
   * array is immutable per injector.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly SidebarContribution[]}
   */
  private readonly contributions: readonly SidebarContribution[] = (
    inject(SIDEBAR_SLOT, { optional: true }) ?? []
  ).toSorted((a: SidebarContribution, b: SidebarContribution): number => a.order - b.order);

  /**
   * Property railContributions
   * @readonly
   *
   * @description
   * The rail widgets that currently apply.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SidebarContribution[]>}
   */
  protected readonly railContributions: Signal<readonly SidebarContribution[]> = computed(
    (): readonly SidebarContribution[] =>
      this.contributions.filter(
        (contribution: SidebarContribution): boolean =>
          contribution.region === 'rail' && (contribution.available?.() ?? true),
      ),
  );
  //#endregion
}

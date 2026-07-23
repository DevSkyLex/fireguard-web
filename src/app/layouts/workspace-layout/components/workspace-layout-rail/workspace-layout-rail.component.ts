import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RAIL_SLOT, type RailContribution } from '@layouts/workspace-layout/slots/rail';

/**
 * Component WorkspaceLayoutRail
 * @class WorkspaceLayoutRail
 *
 * @description
 * The 60px column pinned to the far left of the workspace shell. Renders every
 * {@link RailContribution}, split into a `lead` stack (organization tiles) and
 * a `footer` stack pinned to the bottom (the seat avatar), each sorted by
 * ascending `order`.
 *
 * Structure only: the rail owns no domain data. Organization tiles come from
 * `features/organization`, the seat menu from `features/account`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-workspace-layout-rail />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-workspace-layout-rail',
  imports: [NgComponentOutlet],
  templateUrl: './workspace-layout-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayoutRail {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All registered rail contributions, injected as a multi-provider array.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {RailContribution[]}
   */
  private readonly contributions: RailContribution[] =
    inject<RailContribution[]>(RAIL_SLOT, { optional: true }) ?? [];

  /**
   * Property leadContributions
   * @readonly
   *
   * @description
   * Contributions stacked from the top of the rail. Contributions omitting
   * `region` default here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RailContribution[]>}
   */
  protected readonly leadContributions: Signal<RailContribution[]> = computed(
    (): RailContribution[] => this.byRegion('lead'),
  );

  /**
   * Property footerContributions
   * @readonly
   *
   * @description
   * Contributions pinned to the bottom of the rail.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RailContribution[]>}
   */
  protected readonly footerContributions: Signal<RailContribution[]> = computed(
    (): RailContribution[] => this.byRegion('footer'),
  );
  //#endregion

  //#region Methods
  /**
   * Method byRegion
   * @method byRegion
   *
   * @description
   * Filters contributions docked into one region and sorts them by ascending
   * `order`.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {'lead' | 'footer'} region - Region to collect.
   *
   * @return {RailContribution[]} The ordered contributions of that region.
   */
  private byRegion(region: 'lead' | 'footer'): RailContribution[] {
    return this.contributions
      .filter(
        (contribution: RailContribution): boolean => (contribution.region ?? 'lead') === region,
      )
      .toSorted((a: RailContribution, b: RailContribution): number => a.order - b.order);
  }
  //#endregion
}

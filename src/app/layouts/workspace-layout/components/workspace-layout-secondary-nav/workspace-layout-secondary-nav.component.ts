import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import {
  SECONDARY_NAV_SLOT,
  type SecondaryNavContribution,
} from '@layouts/workspace-layout/slots/secondary-nav';

/**
 * Component WorkspaceLayoutSecondaryNav
 * @class WorkspaceLayoutSecondaryNav
 *
 * @description
 * The channel sidebar column of the workspace shell. Renders every
 * {@link SecondaryNavContribution} stacked by ascending `order`, so each
 * feature publishes its own section (business navigation, search, favorites,
 * channels) instead of the layout owning one monolithic sidebar.
 *
 * Structure only: the column owns the scroll container, not the content.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-workspace-layout-secondary-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-workspace-layout-secondary-nav',
  imports: [NgComponentOutlet],
  templateUrl: './workspace-layout-secondary-nav.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayoutSecondaryNav {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All registered sidebar sections, injected as a multi-provider array.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {SecondaryNavContribution[]}
   */
  private readonly contributions: SecondaryNavContribution[] =
    inject<SecondaryNavContribution[]>(SECONDARY_NAV_SLOT, { optional: true }) ?? [];

  /**
   * Property sections
   * @readonly
   *
   * @description
   * The sidebar sections in render order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<SecondaryNavContribution[]>}
   */
  protected readonly sections: Signal<SecondaryNavContribution[]> = computed(
    (): SecondaryNavContribution[] =>
      this.contributions.toSorted(
        (a: SecondaryNavContribution, b: SecondaryNavContribution): number => a.order - b.order,
      ),
  );
  //#endregion
}

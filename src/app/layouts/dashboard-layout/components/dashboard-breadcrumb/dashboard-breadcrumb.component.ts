import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { BreadcrumbService, type BreadcrumbItem } from '@core/breadcrumb';
import {
  HlmBreadcrumb,
  HlmBreadcrumbEllipsis,
  HlmBreadcrumbItem,
  HlmBreadcrumbLink,
  HlmBreadcrumbList,
  HlmBreadcrumbPage,
  HlmBreadcrumbSeparator,
} from '@shared/ui/breadcrumb';
import {
  HlmDropdownMenu,
  HlmDropdownMenuItem,
  HlmDropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';

/**
 * Component DashboardBreadcrumb
 * @class DashboardBreadcrumb
 *
 * @description
 * The trail in the shell header: where the routed page sits in the workspace.
 *
 * Layout-local shell chrome. It reads `BreadcrumbService`, which the shell
 * provides itself, so the trail is scoped to this shell rather than persisting
 * across the public ones (`ARCHITECTURE.md` §8.2). Each level's label comes from
 * its own route's `data.breadcrumb`; a route that sets it to `false` is skipped,
 * which is how the organization landing page avoids repeating the workspace
 * name the switcher already shows.
 *
 * On narrow screens the trail keeps home and the current page visible while
 * moving intermediate levels into a native Spartan dropdown menu.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-breadcrumb />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * Layout note: the item carries `min-w-0` because a flex item defaults to
 * `min-width: auto`, refuses to shrink below its content, and would push the
 * tool cluster off the card instead of letting the label ellipsise.
 */
@Component({
  selector: 'app-dashboard-breadcrumb',
  imports: [
    RouterLink,
    NgIcon,
    HlmBreadcrumb,
    HlmBreadcrumbEllipsis,
    HlmBreadcrumbItem,
    HlmBreadcrumbLink,
    HlmBreadcrumbList,
    HlmBreadcrumbPage,
    HlmBreadcrumbSeparator,
    HlmDropdownMenu,
    HlmDropdownMenuItem,
    HlmDropdownMenuTrigger,
  ],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './dashboard-breadcrumb.component.html',
  host: { class: 'flex min-w-0 items-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBreadcrumb {
  //#region Properties
  /**
   * Property breadcrumb
   * @readonly
   *
   * @description
   * The shell-scoped trail, rebuilt on every completed navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {BreadcrumbService}
   */
  private readonly breadcrumb: BreadcrumbService = inject<BreadcrumbService>(BreadcrumbService);

  /**
   * Property home
   * @readonly
   *
   * @description
   * The root step, rendered as a glyph because it needs no name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem>}
   */
  protected readonly home: Signal<BreadcrumbItem> = this.breadcrumb.home;

  /**
   * Property items
   * @readonly
   *
   * @description
   * The named steps after home, in order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem[]>}
   */
  protected readonly items: Signal<BreadcrumbItem[]> = this.breadcrumb.items;

  /**
   * Property intermediateItems
   * @readonly
   *
   * @description
   * Ancestor levels collapsed into the narrow-screen ellipsis menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem[]>}
   */
  protected readonly intermediateItems: Signal<BreadcrumbItem[]> = computed(() =>
    this.items().slice(0, -1),
  );
  //#endregion
}

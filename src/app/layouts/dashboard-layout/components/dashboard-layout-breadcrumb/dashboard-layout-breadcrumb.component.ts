import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { BreadcrumbModule, BreadcrumbPassThroughOptions } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { BreadcrumbService } from '@core/services/breadcrumb';

/**
 * Component DashboardLayoutBreadcrumb
 * @class DashboardLayoutBreadcrumb
 *
 * @description
 * Breadcrumb component for dashboard layout header.
 * Renders navigation trail based on active route.
 *
 * The trail collapses its middle entries behind an ellipsis popup only
 * when the full trail does not fit the available width; while it fits,
 * every entry is rendered inline. Fit is measured against the host width
 * and re-evaluated on resize and whenever the trail changes.
 *
 * @version 1.2.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-breadcrumb/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-breadcrumb',
  imports: [RouterModule, BreadcrumbModule, ButtonModule, MenuModule],
  templateUrl: './dashboard-layout-breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutBreadcrumb {
  //#region Properties
  /**
   * Property breadcrumbService
   * @readonly
   *
   * @description
   * Service providing breadcrumb data and logic for dashboard layout.
   * Used to retrieve breadcrumb items based on active route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {BreadcrumbService}
   */
  protected readonly breadcrumbService: BreadcrumbService =
    inject<BreadcrumbService>(BreadcrumbService);

  /**
   * Property host
   * @readonly
   *
   * @description
   * Host element reference, used to compare the rendered trail width
   * (`scrollWidth`) against the available width (`clientWidth`).
   *
   * @access private
   * @since 1.2.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly host: ElementRef<HTMLElement> = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Platform identifier used to guard the browser-only measurement and
   * `ResizeObserver` wiring during SSR.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Destroy reference used to disconnect the `ResizeObserver` and cancel
   * any pending measurement frame when the component is destroyed.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property collapsed
   * @readonly
   *
   * @description
   * Whether the trail is currently collapsed behind the ellipsis popup.
   * Driven by width measurement; only `true` when the full trail does
   * not fit the available width.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly collapsed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Last measured natural width of the fully expanded trail, in pixels.
   * Used while collapsed to decide when the trail fits again.
   */
  private fullWidth: number = 0;

  /**
   * Pending measurement animation-frame handle, or null when idle.
   */
  private measureHandle: number | null = null;

  /**
   * Live observer of the host width, or undefined on the server.
   */
  private resizeObserver?: ResizeObserver;

  /**
   * Property ELLIPSIS_ID
   * @readonly
   *
   * @description
   * Sentinel identifier for the synthetic ellipsis item inserted
   * into `displayItems` when the breadcrumb trail has 3+ entries.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly ELLIPSIS_ID: string = '__ellipsis__';

  /**
   * Property displayItems
   * @readonly
   *
   * @description
   * Model passed to `p-breadcrumb`. The full trail is rendered inline
   * whenever it fits; only when it overflows the available width (and
   * has 3+ entries) are the middle entries replaced with a single
   * ellipsis sentinel that triggers a `p-menu` popup exposing them.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly displayItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const items: MenuItem[] = this.breadcrumbService.items();
    if (items.length < 3 || !this.collapsed()) return items;
    return [items[0], { id: this.ELLIPSIS_ID }, items[items.length - 1]];
  });

  /**
   * Property collapsedItems
   * @readonly
   *
   * @description
   * Menu items shown inside the ellipsis popup.
   * Contains items[1] through items[n-2] (the hidden middle entries).
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly collapsedItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const items: MenuItem[] = this.breadcrumbService.items();
    if (items.length < 3) return [];
    return items.slice(1, -1);
  });

  /**
   * Property breadcrumbPt
   * @readonly
   *
   * @description
   * PrimeNG Breadcrumb component configuration
   * for dashboard layout.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {object}
   */
  protected readonly breadcrumbPt: BreadcrumbPassThroughOptions = {
    root: {
      class: 'text-sm text-surface-500 p-0 bg-surface-0 dark:bg-surface-950 transition-colors',
    },
  };
  //#endregion

  //#region Constants
  /**
   * Pixel tolerance below which a width difference is treated as "fits",
   * absorbing sub-pixel rounding so the trail does not jitter at the edge.
   */
  private static readonly OVERFLOW_EPSILON: number = 1;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * In the browser, re-expands and re-measures the trail whenever it
   * changes, performs an initial measurement after first render, and
   * observes host width changes to keep the collapse decision in sync.
   * No measurement runs on the server, where the full trail is rendered.
   *
   * @access public
   * @since 1.2.0
   */
  public constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    effect(() => {
      this.breadcrumbService.items();
      this.collapsed.set(false);
      this.scheduleMeasure();
    });

    afterNextRender(() => {
      this.measure();
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
      this.resizeObserver.observe(this.host.nativeElement);
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      if (this.measureHandle !== null) cancelAnimationFrame(this.measureHandle);
    });
  }
  //#endregion

  //#region Private Methods
  /**
   * Method scheduleMeasure
   *
   * @description
   * Defers a measurement to the next animation frame so the DOM has
   * settled after the latest render, coalescing rapid resize callbacks.
   *
   * @access private
   * @since 1.2.0
   *
   * @returns {void}
   */
  private scheduleMeasure(): void {
    if (this.measureHandle !== null) cancelAnimationFrame(this.measureHandle);
    this.measureHandle = requestAnimationFrame(() => {
      this.measureHandle = null;
      this.measure();
    });
  }

  /**
   * Method measure
   *
   * @description
   * Toggles `collapsed` from the host geometry. While expanded, records
   * the natural trail width and collapses if it overflows the available
   * width; while collapsed, expands again once the full trail fits.
   *
   * @access private
   * @since 1.2.0
   *
   * @returns {void}
   */
  private measure(): void {
    const host: HTMLElement = this.host.nativeElement;
    const available: number = host.clientWidth;
    if (available <= 0) return;

    if (this.collapsed()) {
      if (this.fullWidth > 0 && available >= this.fullWidth) {
        this.collapsed.set(false);
      }
      return;
    }

    this.fullWidth = host.scrollWidth;
    if (this.fullWidth - available > DashboardLayoutBreadcrumb.OVERFLOW_EPSILON) {
      this.collapsed.set(true);
    }
  }
  //#endregion
}

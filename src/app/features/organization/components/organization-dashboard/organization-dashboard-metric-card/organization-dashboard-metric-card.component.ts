import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  Signal,
  TemplateRef,
  type InputSignal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule, CardPassThroughOptions } from 'primeng/card';
import { CommonModule } from '@angular/common';

/**
 * Type OrganizationDashboardMetricCardComparison
 *
 * @description
 * Scalar delta shown below the KPI value when a previous-period
 * comparison is available. Combines the human-readable formatted
 * value (e.g. `"+3"`) with the direction indicator returned by
 * the backend (`"up"` | `"down"`).
 */
export type OrganizationDashboardMetricCardComparison = {
  readonly value: string | number | null;
  readonly direction: string | number | null;
};

/**
 * Component OrganizationDashboardMetricCard
 * @class OrganizationDashboardMetricCard
 *
 * @description
 * Reusable KPI metric card for the organization dashboard.
 * Displays a title, description, a KPI value and an optional
 * comparison delta badge (up/down arrow + formatted difference).
 * Shows a skeleton while loading.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-metric-card',
  templateUrl: './organization-dashboard-metric-card.component.html',
  imports: [CardModule, SkeletonModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardMetricCard {
  //#region Inputs
  /**
   * Input title
   *
   * @description
   * Card heading displayed in the
   * PrimeNG card header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> =
    input.required<string>();

  /**
   * Input description
   *
   * @description
   * Subtitle shown below the card heading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> =
    input<string>();

  /**
   * Input value
   *
   * @description
   * KPI value to display. Rendered as `—` when null.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | number | null>}
   */
  public readonly value: InputSignal<string | number | null> =
    input.required<string | number | null>();

  /**
   * Input icon
   *
   * @description
   * Optional icon to display in the
   * top-left corner of the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> =
    input<string | null>(null);

  /**
   * Input loading
   *
   * @description
   * When true, a skeleton placeholder is
   * shown instead of the value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> =
    input<boolean>(false);

  /**
   * Input comparison
   *
   * @description
   * Optional previous-period comparison delta. When non-null, an
   * up/down badge is rendered next to the KPI value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationDashboardMetricCardComparison | null>}
   */
  public readonly comparison: InputSignal<OrganizationDashboardMetricCardComparison | null> =
    input<OrganizationDashboardMetricCardComparison | null>(null);

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Pass-through options for customizing the styling of the PrimeNG Card component.
   * This allows for consistent styling across all metric cards while still
   * enabling specific adjustments as needed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class: 'h-full flex flex-col gap-4 border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    content: {
      class: 'px-4 pb-4',
    },
    header: {
      class: 'px-4 pt-4',
    },
    footer: {
      class: 'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 px-4 py-3 rounded-b-md',
    },
  };

  /**
   * Property action
   * @readonly
   *
   * @description
   * A template reference for the action section
   * of the card, allowing for  custom content such as buttons or links to be
   * injected into the card's action area.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly action: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('action');
  //#endregion
}

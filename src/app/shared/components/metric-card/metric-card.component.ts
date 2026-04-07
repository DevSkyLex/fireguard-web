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
 * Type MetricComparison
 *
 * @description
 * Scalar delta shown below the KPI value when a previous-period
 * comparison is available. Combines the human-readable formatted
 * value (e.g. `"+3"`) with the direction indicator (`"up"` | `"down"`).
 */
export type MetricComparison = {
  readonly value: string | number | null;
  readonly direction: string | null;
};

/**
 * Component MetricCard
 * @class MetricCard
 *
 * @description
 * Reusable KPI metric card.
 * Displays a title, description, a KPI value and an optional
 * comparison delta badge (up/down arrow + formatted difference).
 * Shows a skeleton while loading.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-metric-card',
  templateUrl: './metric-card.component.html',
  imports: [CardModule, SkeletonModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCard {
  //#region Inputs
  /**
   * Property title
   * @readonly
   *
   * @description
   * Card heading displayed in the PrimeNG card header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> =
    input.required<string>();

  /**
   * Property description
   * @readonly
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
   * Property value
   * @readonly
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
   * Property icon
   * @readonly
   *
   * @description
   * Optional PrimeIcons class displayed in the top-left corner of the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> =
    input<string | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * When true, a skeleton placeholder is shown instead of the KPI value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> =
    input<boolean>(false);

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Optional previous-period comparison delta. When non-null, an
   * up/down badge is rendered next to the KPI value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MetricComparison | null>}
   */
  public readonly comparison: InputSignal<MetricComparison | null> =
    input<MetricComparison | null>(null);

  /**
   * Property action
   * @readonly
   *
   * @description
   * Optional template reference projected into the card header's action area.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly action: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('action');
  //#endregion

  //#region Properties
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Pass-through options for the PrimeNG Card component, allowing for
   * customization of the card's appearance and behavior.
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
  //#endregion
}

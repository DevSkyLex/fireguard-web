import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
  InputSignal,
  Signal,
  TemplateRef,
} from '@angular/core';
import { CardModule, CardPassThroughOptions } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import type { MetricComparison } from '@shared/components/metric-card';

/**
 * Type MetricSummary
 *
 * @description
 * Shape of a single KPI tile rendered inside
 * the trend card's metrics bar.
 */
export type MetricSummary = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison?: MetricComparison | null;
};

/**
 * Component TrendCard
 * @class TrendCard
 *
 * @description
 * A reusable card component that provides a flexible and customizable container
 * for displaying trend content with an optional inline metrics bar.
 *
 * @example ```html
 * <app-trend-card [title]="cardTitle" [description]="cardDescription">
 *  <ng-template #content><!-- Custom content goes here --></ng-template>
 *  <ng-template #action><!-- Custom action buttons or links go here --></ng-template>
 *  <ng-template #footer><!-- Custom footer content goes here --></ng-template>
 * </app-trend-card>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-trend-card',
  templateUrl: './trend-card.component.html',
  imports: [CardModule, CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendCard {
  //#region Inputs
  /**
   * Property title
   * @readonly
   *
   * @description
   * The title displayed in the card header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional subtitle shown below the title.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> = input<string>();

  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Optional list of KPI summaries rendered as an inline metrics bar
   * above the card content. Shows skeleton cells while {@link loading} is true.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MetricSummary[]>}
   */
  public readonly metrics: InputSignal<readonly MetricSummary[]> = input<readonly MetricSummary[]>(
    [],
  );

  /**
   * Property loading
   * @readonly
   *
   * @description
   * When true, skeleton placeholders are shown in the metrics bar
   * instead of real values.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property action
   * @readonly
   *
   * @description
   * Optional template reference projected into the card header's
   * action area (e.g. buttons, selects).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly action: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('action');

  /**
   * Property content
   * @readonly
   *
   * @description
   * Required template reference projected into the card body.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown>>}
   */
  public readonly content: Signal<TemplateRef<unknown>> =
    contentChild.required<TemplateRef<unknown>>('content');

  /**
   * Property footer
   * @readonly
   *
   * @description
   * Optional template reference projected into the card footer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly footer: Signal<TemplateRef<unknown> | undefined> =
    contentChild<TemplateRef<unknown>>('footer');
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
      class:
        'h-full flex flex-col gap-4 border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    content: {
      class: 'pb-4 flex-1 flex flex-col',
    },
    header: {
      class: 'px-4 pt-4',
    },
    footer: {
      class:
        'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 px-4 py-3 rounded-b-md',
    },
  };
  //#endregion
}

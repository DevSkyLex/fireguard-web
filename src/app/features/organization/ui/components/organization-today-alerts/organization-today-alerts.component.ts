import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ErrorState } from '@shared/error-state';
import { tagSeverityIconClass, type TagSeverity } from '@shared/tag-severity';
import type { TodayAlertRow } from './models';

/**
 * Constant ALERTS_CARD_STYLE_CLASS
 *
 * @description
 * Card frame for the panel: a flat bordered surface that sizes to its rows.
 *
 * Deliberately NOT `@shared/table-card-shell`. That shell is documented for
 * `p-table` grids and carries `h-full` plus `overflow-hidden` so a grid can fill
 * a sized flex parent and scroll internally. This panel is a short, content-sized
 * list in an auto-height column: it must claim no height it does not need, and
 * must not clip.
 *
 * @since 1.0.0
 */
const ALERTS_CARD_STYLE_CLASS = 'flex flex-col border border-surface-200 dark:border-surface-800';

/**
 * Constant ALERTS_CARD_PT
 *
 * @description
 * Bordered header, unpadded body so the rows own their own edges and their
 * dividers run the full width of the card.
 *
 * @since 1.0.0
 */
const ALERTS_CARD_PT: CardPassThroughOptions = {
  body: { class: 'flex flex-col p-0' },
  content: { class: 'flex flex-col p-0' },
  header: {
    class: 'flex items-center gap-2 border-b border-surface-200 px-4 py-3 dark:border-surface-800',
  },
};

/**
 * Component OrganizationTodayAlerts
 * @class OrganizationTodayAlerts
 *
 * @description
 * Presentational strip of the landing page: what the backend alert feed reports
 * waiting elsewhere in the organization — open non-conformities, expired
 * invitations, equipment under maintenance — one row per kind, most severe
 * first.
 *
 * It reports counts because that is all the feed returns. Work the collection
 * can enumerate is rendered as a queue of real interventions instead, so this
 * strip renders nothing at all when the feed is empty: the page owns the
 * all-clear message.
 *
 * Takes rows and state through inputs and emits selection upward; it injects no
 * store and calls no service (ARCHITECTURE.md §10.3).
 *
 * @example
 * ```html
 * <app-organization-today-alerts
 *   [rows]="alertRows()"
 *   [loading]="store.isQueryLoading()"
 *   [hasError]="store.queryHasError()"
 *   (selected)="openAlert($event)"
 *   (retried)="retryAlerts()"
 * />
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today-alerts',
  templateUrl: './organization-today-alerts.component.html',
  imports: [ButtonModule, CardModule, SkeletonModule, ErrorState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTodayAlerts {
  //#region Inputs
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Work waiting on the operator, already filtered of zero counts and ordered by
   * severity by the parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly TodayAlertRow[]>}
   */
  public readonly rows: InputSignal<readonly TodayAlertRow[]> =
    input.required<readonly TodayAlertRow[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the underlying counts are still resolving.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Whether the counts failed to load. Takes precedence over rows.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasError: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   *
   * @description
   * Emits the {@link TodayAlertRow.id} of the chosen row so the parent can
   * resolve and perform the navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Emits when the operator asks for the failed counts to be fetched again.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property cardStyleClass
   * @readonly
   *
   * @description
   * Shared card-shell classes, so the panel sits in the same frame as the other
   * dashboard surfaces.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly cardStyleClass: string = ALERTS_CARD_STYLE_CLASS;

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Shared card-shell passthrough: bordered header, unpadded body so the rows own
   * their own edges.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = ALERTS_CARD_PT;

  /**
   * Property skeletonRows
   * @readonly
   *
   * @description
   * Placeholder slots rendered while the counts resolve.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonRows: readonly number[] = [0, 1, 2];

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the strip is worth rendering. An empty feed says nothing the
   * operator needs — the page states the all-clear once, for every source.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly visible: Signal<boolean> = computed<boolean>(
    () => this.hasError() || this.loading() || this.rows().length > 0,
  );
  //#endregion

  //#region Methods
  /**
   * Method iconClass
   *
   * @description
   * Resolves the severity-tinted icon colour for a row through the shared
   * severity vocabulary.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TagSeverity} severity - Row severity.
   * @returns {string} Literal Tailwind classes for the icon.
   */
  protected iconClass(severity: TagSeverity): string {
    return tagSeverityIconClass(severity);
  }
  //#endregion
}

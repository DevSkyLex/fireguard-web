import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type {
  MaintenanceEconomicAmount,
  MaintenanceEconomicRow,
} from '@features/organization/features/maintenance-costs/models';
import { formatMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { CollectionPagination } from '@shared/collection-pagination';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';

/**
 * Interface ReportMetric
 * @interface ReportMetric
 *
 * @description
 * One displayed amount category; budgets never merge into forecasts or realized costs.
 */
interface ReportMetric {
  /**
   * Property key
   *
   * @description
   * Typed projection key on the server's allocation row.
   *
   * @type {'current' | 'frozen' | 'planned' | 'budget'}
   */
  readonly key: 'current' | 'frozen' | 'planned' | 'budget';

  /**
   * Property label
   *
   * @description
   * Localized amount category used by table headers and mobile descriptions.
   *
   * @type {string}
   */
  readonly label: string;
}

/**
 * Class MaintenanceReportTable
 * @class MaintenanceReportTable
 *
 * @description
 * Presents server-calculated allocations with exact money and explicit incompleteness, without
 * calculating scope totals.
 */
@Component({
  selector: 'app-maintenance-report-table',
  templateUrl: './maintenance-report-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CollectionPagination,
    HlmBadge,
    HlmButton,
    HlmSpinner,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
  ],
})
export class MaintenanceReportTable {
  //#region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Visible server allocation page, or the separately supplied unallocated row.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly MaintenanceEconomicRow[]>}
   */
  public readonly rows: InputSignal<readonly MaintenanceEconomicRow[]> = input<
    readonly MaintenanceEconomicRow[]
  >([]);

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Single organization currency authorized by the dedicated financial report.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly currency: InputSignal<string> = input.required<string>();

  /**
   * Property caption
   * @readonly
   *
   * @description
   * Accessible allocation context, including a distinct caption for unallocated contributions.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly caption: InputSignal<string> = input(
    $localize`:@@maintenanceCost.report.table.caption:Economic cost allocations`,
  );

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Indicates a superseding read while previously displayed row values remain intact.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property page
   * @readonly
   *
   * @description
   * Actual one-based server allocation page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input(1);

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Actual result page size supplied by the server report.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly itemsPerPage: InputSignal<number> = input(25);

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Full filtered destination count, independent of the visible row page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly totalItems: InputSignal<number> = input(0);

  /**
   * Property showPagination
   * @readonly
   *
   * @description
   * False for the separate unallocated section, which is outside allocated result pagination.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showPagination: InputSignal<boolean> = input(true);

  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Requests another server allocation page without estimating totals locally.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property pageSizeChanged
   * @readonly
   *
   * @description
   * Requests a new bounded server allocation page size.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageSizeChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property dossiersRequested
   * @readonly
   *
   * @description
   * Requests the named, paginated financial source directory for the selected allocation row.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenanceEconomicRow>}
   */
  public readonly dossiersRequested: OutputEmitterRef<MaintenanceEconomicRow> =
    output<MaintenanceEconomicRow>();

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Interface locale used for exact integer grouping and the decimal separator.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Separate realized, frozen, forecast and budget projections shared by both responsive layouts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly ReportMetric[]}
   */
  protected readonly metrics: readonly ReportMetric[] = [
    {
      key: 'current',
      label: $localize`:@@maintenanceCost.report.table.current:Current realized cost`,
    },
    { key: 'frozen', label: $localize`:@@maintenanceCost.report.table.frozen:Cost at closure` },
    { key: 'planned', label: $localize`:@@maintenanceCost.report.table.planned:Forecast cost` },
    { key: 'budget', label: $localize`:@@maintenanceCost.report.table.budget:Budget` },
  ];

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Navigation count derived solely from server destination count and page size.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / Math.max(1, this.itemsPerPage()))),
  );
  //#endregion

  //#region Methods
  /**
   * Method money
   * @method money
   *
   * @description
   * Formats complete or unknown exact values without converting monetary strings to numbers.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string | null | undefined} amount - Exact value, or explicitly unknown.
   *
   * @returns {string} Localized exact amount and currency, or the unknown label.
   */
  protected money(amount: string | null | undefined): string {
    return formatMaintenanceAmount(amount, this.currency(), this.locale);
  }

  /**
   * Method total
   * @method total
   *
   * @description
   * Keeps incomplete totals unknown even when the known subtotal is zero or positive.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceEconomicAmount} amount - Server valuation completeness and totals.
   *
   * @returns {string} Complete exact total or an explicit unknown label.
   */
  protected total(amount: MaintenanceEconomicAmount): string {
    return this.money(amount.complete ? amount.total : null);
  }

  /**
   * Method rowLabel
   * @method rowLabel
   *
   * @description
   * Names an authorized allocation without exposing raw identifiers as fallback labels.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceEconomicRow} row - Server allocation identity and minimal name.
   *
   * @returns {string} Source name, unallocated label or explicit missing historical identity.
   */
  protected rowLabel(row: MaintenanceEconomicRow): string {
    if (row.name?.trim()) return row.name;
    return row.id
      ? $localize`:@@maintenanceCost.report.table.unknownIdentity:Historical identity unavailable`
      : $localize`:@@maintenanceCost.report.table.unallocated:Unallocated costs`;
  }

  /**
   * Method identityLabel
   * @method identityLabel
   *
   * @description
   * Explains server identity provenance without implying that current names rewrite historical
   * dossiers.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} state - Server identity availability and provenance code.
   *
   * @returns {string} Localized identity provenance, with a safe fallback for unknown codes.
   */
  protected identityLabel(state: string): string {
    switch (state) {
      case 'captured':
        return $localize`:@@maintenanceCost.report.table.capturedIdentity:Identity recorded at closure`;
      case 'live':
        return $localize`:@@maintenanceCost.report.table.liveIdentity:Current identity`;
      case 'mixed':
        return $localize`:@@maintenanceCost.report.table.mixedIdentity:Current and recorded identity`;
      case 'unallocated':
        return $localize`:@@maintenanceCost.report.table.unallocatedIdentity:No allocation identity`;
      default:
        return $localize`:@@maintenanceCost.report.table.incompleteIdentity:Identity is incomplete`;
    }
  }
  //#endregion
}

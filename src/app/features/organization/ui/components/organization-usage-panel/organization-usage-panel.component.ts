import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideGauge } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type {
  OrganizationQuotaItemOutput,
  OrganizationQuotaResource,
} from '@features/organization/models';
import { resolveQuotaStatus } from '@features/organization/utils';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import {
  ORGANIZATION_QUOTA_RESOURCE_DESCRIPTIONS,
  ORGANIZATION_QUOTA_RESOURCE_LABELS,
} from './constants/organization-quota-resource-labels.constants';
import { QUOTA_STATUS_TAG_ICON_CLASS } from './constants/quota-status-tag-icon-class.constants';
import { resolveQuotaStatusTag, type OrganizationUsageRow } from './models';

/**
 * Constant PERCENT_SCALE
 *
 * @description
 * Divisor turning a used/limit ratio into a whole percentage.
 *
 * @since 1.0.0
 */
const PERCENT_SCALE = 100;

/**
 * Component OrganizationUsagePanel
 * @class OrganizationUsagePanel
 *
 * @description
 * The settings Usage tab: one meter row per capped resource (members,
 * facilities, equipment, inspections), each showing used/limit, a percentage
 * bar, and — for a resource without a plan cap — an "unlimited" row with no
 * bar. Every near-limit or full row pairs its colour with an icon and a
 * label, never colour alone (`PRODUCT.md`).
 *
 * Presentational: the quota usage it renders is loaded by the page from the
 * root-provided `OrganizationQuotaStore` and handed down as {@link items}
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-usage-panel
 *   [items]="quotaStore.items()"
 *   [isLoading]="quotaStore.isLoadingQuota()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-usage-panel',
  imports: [NgIcon, ...HlmEmptyImports, HlmSkeleton, ...HlmProgressImports],
  providers: [provideIcons({ lucideCircleAlert, lucideGauge })],
  templateUrl: './organization-usage-panel.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationUsagePanel {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * The organization's quota usage items, one per capped resource.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<OrganizationQuotaItemOutput>>}
   */
  public readonly items: InputSignal<ReadonlyArray<OrganizationQuotaItemOutput>> = input<
    ReadonlyArray<OrganizationQuotaItemOutput>
  >([]);

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the quota usage is loading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isLoading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * The quota usage load failure, if any.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Each usage item joined with its label, resolved status and meter
   * percentage.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<OrganizationUsageRow>>}
   */
  protected readonly rows: Signal<ReadonlyArray<OrganizationUsageRow>> = computed<
    ReadonlyArray<OrganizationUsageRow>
  >(() =>
    this.items().map((item: OrganizationQuotaItemOutput): OrganizationUsageRow => {
      const resource: OrganizationQuotaResource = item.resource;
      const hasLimit: boolean = item.limit !== null && item.limit > 0;

      return {
        resource,
        label: ORGANIZATION_QUOTA_RESOURCE_LABELS[resource],
        description: ORGANIZATION_QUOTA_RESOURCE_DESCRIPTIONS[resource],
        used: item.used,
        limit: item.limit,
        percent:
          hasLimit && item.limit !== null
            ? Math.min(PERCENT_SCALE, Math.round((item.used / item.limit) * PERCENT_SCALE))
            : null,
        remaining: item.limit === null ? null : Math.max(0, item.limit - item.used),
        status: resolveQuotaStatusTag(resolveQuotaStatus(item.used, item.limit)),
      };
    }),
  );

  /**
   * Property statusIconClass
   * @readonly
   * @description Maps a row's severity to its icon colour.
   * @access protected
   * @since 1.0.0
   * @type {typeof QUOTA_STATUS_TAG_ICON_CLASS}
   */
  protected readonly statusIconClass: typeof QUOTA_STATUS_TAG_ICON_CLASS =
    QUOTA_STATUS_TAG_ICON_CLASS;
  //#endregion
}

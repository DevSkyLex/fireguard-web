import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  OnInit,
  output,
  signal,
  untracked,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { OrganizationPlanChangeDialog } from '../../dialogs/organization-plan-change-dialog';
import type { OrganizationPlanRow } from './models';

/**
 * Function priceLabelOf
 *
 * @description
 * Formats a plan's monthly price from the pricing catalog, or the localized
 * "Free" label when the plan carries no priced entry or a zero amount.
 * Formats against the app's own `LOCALE_ID` rather than `Intl`'s runtime
 * default, which drifts between a developer machine, CI and production.
 *
 * @param {PlanOutput} plan - The catalog plan.
 * @param {ReadonlyArray<PlanPricingOutput>} pricing - The pricing catalog.
 * @param {string} localeId - The active Angular locale.
 *
 * @returns {string} The formatted monthly price label.
 */
function priceLabelOf(
  plan: PlanOutput,
  pricing: ReadonlyArray<PlanPricingOutput>,
  localeId: string,
): string {
  const entry: PlanPricingOutput | undefined = pricing.find((p) => p.planKey === plan.key);
  const amount: number | null | undefined = entry?.monthlyAmount;

  if (entry === undefined || amount === null || amount === undefined || amount === 0) {
    return $localize`:@@org.settings.plan.free:Free`;
  }

  const formatted: string = new Intl.NumberFormat(localeId, {
    style: 'currency',
    currency: entry.currency,
  }).format(amount / 100);

  return $localize`:@@org.settings.plan.perMonth:${formatted}:price:/month`;
}

/**
 * Component OrganizationPlanSelector
 * @class OrganizationPlanSelector
 *
 * @description
 * The subscription tab's plan catalog: one card per plan, priced against the
 * billing pricing catalog, carrying the current-plan marker and a
 * confirm-gated switch action.
 *
 * `FEATURE.md` scopes `OrganizationPlanStore` to this exact component rather
 * than to the settings page, mirroring `OrganizationSwitcher`
 * (`ARCHITECTURE.md` §2.7): it is a self-contained, feature-owned widget that
 * loads its own catalog and drives its own mutation, so the page only feeds
 * it identity ({@link organizationId}, {@link currentPlanId}) and the pricing
 * catalog it does not itself own. The switch confirm is
 * {@link OrganizationPlanChangeDialog}, still hosted here rather than by the
 * page — `DESIGN.md`'s Action Surfaces rule lets a documented container
 * component host an overlay and talk to a store, and this component is that
 * documented owner of `OrganizationPlanStore`.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-organization-plan-selector
 *   [organizationId]="organizationId()"
 *   [currentPlanId]="organization().planId ?? null"
 *   [pricing]="billingStore.pricing()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-plan-selector',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    OrganizationPlanChangeDialog,
    ...HlmCardImports,
  ],
  providers: [OrganizationPlanStore, provideIcons({ lucideCheck })],
  templateUrl: './organization-plan-selector.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPlanSelector implements OnInit {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The organization the plan change applies to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property currentPlanId
   * @readonly
   *
   * @description
   * The organization's current plan id, marking the matching card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentPlanId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property pricing
   * @readonly
   *
   * @description
   * Display pricing for the payable plans, owned by the page's
   * `OrganizationBillingStore` and handed down because this component does
   * not itself load billing data.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<PlanPricingOutput>>}
   */
  public readonly pricing: InputSignal<ReadonlyArray<PlanPricingOutput>> = input<
    ReadonlyArray<PlanPricingOutput>
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property currentPlanKeyChange
   * @readonly
   *
   * @description
   * Emits the catalog `key` of the plan currently marked as current, or
   * `null` before the catalog has loaded or resolved one. The page needs the
   * key — not the id it already has as {@link currentPlanId} — to start a
   * recovery Checkout session for an organization with no active
   * subscription, and this catalog is the only place that key is loaded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly currentPlanKeyChange: OutputEmitterRef<string | null> = output<string | null>();
  //#endregion

  //#region Properties
  /**
   * Property planStore
   * @readonly
   *
   * @description
   * Component-scoped store owning the plan catalog and the self-service
   * change (`FEATURE.md`).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPlanStore}
   */
  private readonly planStore: OrganizationPlanStore =
    inject<OrganizationPlanStore>(OrganizationPlanStore);

  /**
   * Property localeId
   * @readonly
   * @description The active Angular locale, used to format each card's price.
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /**
   * Property isLoading
   * @readonly
   * @description Whether the plan catalog is loading.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = this.planStore.isLoadingPlans;

  /**
   * Property loadError
   * @readonly
   * @description The catalog load failure, if any.
   * @access protected
   * @since 1.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly loadError: Signal<StoreError | null> = this.planStore.plansError;

  /**
   * Property isChanging
   * @readonly
   * @description Whether a plan change is in flight, which locks every card.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isChanging: Signal<boolean> = this.planStore.isChangingPlan;

  /**
   * Property changeError
   * @readonly
   * @description The last plan change failure, if any.
   * @access protected
   * @since 1.0.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly changeError: Signal<StoreError | null> = this.planStore.changePlanError;

  /**
   * Property changeSucceeded
   * @readonly
   * @description Whether the last plan change succeeded.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly changeSucceeded: Signal<boolean> = this.planStore.changePlanSucceeded;

  /**
   * Property rows
   * @readonly
   * @description Each catalog plan joined with its formatted price and current-plan marker.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<OrganizationPlanRow>>}
   */
  protected readonly rows: Signal<ReadonlyArray<OrganizationPlanRow>> = computed<
    ReadonlyArray<OrganizationPlanRow>
  >(() => {
    const currentId: string | null = this.currentPlanId();

    return this.planStore.plans().map((plan: PlanOutput): OrganizationPlanRow => ({
      id: plan.id,
      key: plan.key,
      name: plan.name,
      description: plan.description ?? null,
      priceLabel: priceLabelOf(plan, this.pricing(), this.localeId),
      quotas: plan.quotas,
      isCurrent: plan.id === currentId,
    }));
  });

  /**
   * Property pendingPlan
   * @readonly
   * @description The plan awaiting switch confirmation, if any.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<OrganizationPlanRow | null>}
   */
  protected readonly pendingPlan: WritableSignal<OrganizationPlanRow | null> =
    signal<OrganizationPlanRow | null>(null);

  /**
   * Property emitCurrentPlanKey
   * @readonly
   *
   * @description
   * Reports the current plan's catalog key to the page whenever {@link rows}
   * resolves one, so a page-level recovery Checkout action can target it
   * without this component owning `OrganizationBillingStore`.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly emitCurrentPlanKey: EffectRef = effect((): void => {
    const current: OrganizationPlanRow | undefined = this.rows().find(
      (row: OrganizationPlanRow): boolean => row.isCurrent,
    );

    untracked(() => this.currentPlanKeyChange.emit(current?.key ?? null));
  });
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   * @method ngOnInit
   *
   * @description
   * Loads the plan catalog.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.planStore.loadPlans();
  }
  //#endregion

  //#region Methods
  /**
   * Method requestChange
   * @method requestChange
   *
   * @description
   * Opens the switch confirmation for a non-current plan.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationPlanRow} row - The plan card picked.
   *
   * @returns {void}
   */
  protected requestChange(row: OrganizationPlanRow): void {
    if (row.isCurrent) return;

    this.pendingPlan.set(row);
  }

  /**
   * Method onDialogVisibleChange
   * @method onDialogVisibleChange
   *
   * @description
   * Mirrors an overlay-initiated close back into the pending target.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {boolean} visible - The dialog's next visibility.
   *
   * @returns {void}
   */
  protected onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.pendingPlan.set(null);
  }

  /**
   * Method confirmChange
   * @method confirmChange
   *
   * @description
   * Applies the confirmed plan switch and closes the dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmChange(): void {
    const target: OrganizationPlanRow | null = this.pendingPlan();
    this.pendingPlan.set(null);

    if (target === null) return;

    this.planStore.changePlan({ organizationId: this.organizationId(), planId: target.id });
  }
  //#endregion
}

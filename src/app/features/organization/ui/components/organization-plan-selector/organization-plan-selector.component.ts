import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type OnInit,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { type OrganizationOutput, type PlanOutput } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationPlanStore } from '@features/organization/state';

/**
 * Component OrganizationPlanSelector
 * @class OrganizationPlanSelector
 *
 * @description
 * Organization-owned subscription selector rendered inside the settings page's
 * "Subscription" tab. Lists the selectable plans with their per-resource quota
 * sentences, highlights the organization's current plan and lets an
 * administrator switch plan. Switching refreshes the active organization so the
 * plan badge and usage meters reflect the new limits.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-plan-selector',
  imports: [ButtonModule, MessageModule, TagModule],
  providers: [OrganizationPlanStore],
  templateUrl: './organization-plan-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPlanSelector implements OnInit {
  //#region Properties
  /** Active organization context store. */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Section-scoped plan workflow store. */
  protected readonly store: OrganizationPlanStore = inject(OrganizationPlanStore);
  /** PrimeNG message service used for change feedback. */
  private readonly messageService: MessageService = inject(MessageService);

  /** Identifier of the plan currently being switched to, for per-card feedback. */
  protected readonly pendingPlanId: WritableSignal<string | null> = signal<string | null>(null);

  /** Identifier of the organization's current plan. */
  protected readonly currentPlanId: Signal<string | null> = computed<string | null>(
    () => this.activeOrganizationStore.selectedOrganization()?.planId ?? null,
  );
  //#endregion

  //#region Methods
  /** Surfaces plan-change outcomes as toasts and clears the pending plan marker. */
  public constructor() {
    effect(() => {
      if (this.store.changePlanSucceeded()) {
        this.pendingPlanId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Plan updated',
          detail: 'The organization subscription plan has been updated.',
        });
      }
    });

    effect(() => {
      if (this.store.changePlanError() !== null) {
        this.pendingPlanId.set(null);
      }
    });
  }

  /**
   * Method ngOnInit
   *
   * @description
   * Loads the selectable plans when the component is initialized.
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.store.loadPlans();
  }

  /**
   * Method isCurrentPlan
   *
   * @description
   * Returns whether the provided plan is the organization's current plan.
   *
   * @param {PlanOutput} plan - Plan to evaluate.
   * @returns {boolean} `true` when the plan is the current plan.
   */
  protected isCurrentPlan(plan: PlanOutput): boolean {
    return plan.id === this.currentPlanId();
  }

  /**
   * Method selectPlan
   *
   * @description
   * Switches the organization to the provided plan, unless it is already the
   * current plan or a change is in flight.
   *
   * @param {PlanOutput} plan - Plan to switch to.
   * @returns {void}
   */
  protected selectPlan(plan: PlanOutput): void {
    if (this.isCurrentPlan(plan) || this.store.isChangingPlan()) {
      return;
    }

    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();
    if (organization === null) {
      return;
    }

    this.pendingPlanId.set(plan.id);
    this.store.changePlan({ organizationId: organization.id, planId: plan.id });
  }

  /**
   * Method retryLoad
   *
   * @description
   * Retries loading the selectable plans after a load failure.
   *
   * @returns {void}
   */
  protected retryLoad(): void {
    this.store.loadPlans();
  }
  //#endregion
}

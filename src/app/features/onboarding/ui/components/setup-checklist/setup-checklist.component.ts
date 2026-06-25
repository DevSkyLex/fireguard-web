import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  type Signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule, type PopoverPassThroughOptions } from 'primeng/popover';
import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import type { OnboardingStepKey, OnboardingStepPresentation } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';

/**
 * Component SetupChecklist
 * @class SetupChecklist
 *
 * @description
 * Persistent, non-blocking activation control rendered in the dashboard topbar.
 * Shows a compact "set up · done/total" trigger that opens a checklist popover
 * listing every onboarding step with its status, a "Continue setup" action that
 * opens the wizard, and a "Hide for now" action that dismisses the flow. The
 * whole control self-hides once onboarding is completed or dismissed.
 *
 * Owned by the onboarding feature and contributed to the shell via
 * `withSetupChecklist()`; the layout renders it without knowing the store.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-setup-checklist',
  imports: [ButtonModule, PopoverModule],
  templateUrl: './setup-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupChecklist {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OnboardingStore}
   */
  protected readonly store: OnboardingStore = inject<OnboardingStore>(OnboardingStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property popover
   * @readonly
   *
   * @description
   * Reference to the PrimeNG Popover instance controlling the checklist panel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Popover>}
   */
  protected readonly popover: Signal<Popover> = viewChild.required<Popover>('popover');

  /**
   * Property popoverPt
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PopoverPassThroughOptions}
   */
  protected readonly popoverPt: PopoverPassThroughOptions = {
    content: { class: 'p-0 overflow-hidden' },
  };

  /**
   * Property stepMeta
   * @readonly
   *
   * @description
   * Shared, localized presentation metadata (icon + label + subtitle) for every
   * onboarding step, reused from the feature-level registry so the checklist and
   * the wizard rail render identical step copy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<OnboardingStepKey, OnboardingStepPresentation>}
   */
  protected readonly stepMeta: Record<OnboardingStepKey, OnboardingStepPresentation> =
    ONBOARDING_STEP_PRESENTATION;
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Hydrates the onboarding record once on the browser so the control can decide
   * whether to show and render its progress.
   */
  public constructor() {
    afterNextRender(() => {
      this.store.load();
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method toggle
   *
   * @description
   * Refreshes the onboarding state (to reflect resources created elsewhere) and
   * toggles the checklist popover.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The trigger click, used to anchor the popover.
   * @returns {void}
   */
  protected toggle(event: MouseEvent): void {
    if (!this.store.isLoading()) {
      this.store.load();
    }
    this.popover().toggle(event);
  }

  /**
   * Method continueSetup
   *
   * @description
   * Closes the popover and opens the activation wizard.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected continueSetup(): void {
    this.popover().hide();
    this.router.navigate(['/onboarding']).catch(() => undefined);
  }

  /**
   * Method stepStatusIcon
   *
   * @description
   * Returns the PrimeIcons class for a step's status indicator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} status - The step status.
   * @returns {string} The icon class.
   */
  protected stepStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'pi pi-check-circle text-green-500';
      case 'skipped':
        return 'pi pi-minus-circle text-surface-400 dark:text-surface-500';
      default:
        return 'pi pi-circle text-surface-300 dark:text-surface-600';
    }
  }
  //#endregion
}

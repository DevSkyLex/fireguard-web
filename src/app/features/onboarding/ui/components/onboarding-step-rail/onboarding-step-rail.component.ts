import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ONBOARDING_STEP_PRESENTATION } from '@features/onboarding/constants';
import {
  resolveOnboardingStepStatusTag,
  type OnboardingOutput,
  type OnboardingStepKey,
  type OnboardingStepOutput,
} from '@features/onboarding/models';
import { HlmItem, HlmItemGroup } from '@shared/ui/item';
import { HlmProgress, HlmProgressIndicator } from '@shared/ui/progress';
import { ONBOARDING_STEP_RAIL_ICONS } from './constants/onboarding-step-rail-icons.constants';
import { ONBOARDING_STEP_STATUS_TAG_ICON_CLASS } from './constants/onboarding-step-status-tag-severity.constants';
import type { OnboardingStepRailRow } from './models';

/**
 * Component OnboardingStepRail
 * @class OnboardingStepRail
 *
 * @description
 * Read-only activation progress composed of native Spartan items. The active
 * step has a muted surface, `aria-current="step"`, and a short sublabel.
 * Ordinary status labels remain available to assistive technology; skipped
 * and blocked statuses stay visible. A future step blocked only by its order
 * is presented as not started, rather than as a failure.
 * Shared by the desktop showcase and the mobile progress disclosure.
 *
 * Purely presentational: it takes the onboarding record's steps and renders
 * them, never injecting the store itself (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-step-rail [steps]="store.steps()" [activeStepKey]="store.nextStep()" [progress]="store.progress()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-step-rail',
  imports: [HlmItem, HlmItemGroup, HlmProgressIndicator, NgIcon, HlmProgress],
  providers: [provideIcons(ONBOARDING_STEP_RAIL_ICONS)],
  templateUrl: './onboarding-step-rail.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepRail {
  //#region Inputs
  /**
   * Property steps
   * @readonly
   * @description The onboarding record's steps, in backend order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OnboardingStepOutput[]>}
   */
  public readonly steps: InputSignal<readonly OnboardingStepOutput[]> = input<
    readonly OnboardingStepOutput[]
  >([]);

  /**
   * Property activeStepKey
   * @readonly
   * @description Key of the step the operator should act on next, or `null` once every step is resolved.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OnboardingStepKey | null>}
   */
  public readonly activeStepKey: InputSignal<OnboardingStepKey | null> =
    input<OnboardingOutput['nextStep']>(null);

  /**
   * Property progress
   * @readonly
   * @description Completed-versus-total step count, driving the progress bar.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<{ readonly done: number; readonly total: number }>}
   */
  public readonly progress: InputSignal<{ readonly done: number; readonly total: number }> = input<{
    readonly done: number;
    readonly total: number;
  }>({ done: 0, total: 0 });

  /**
   * Property compact
   * @readonly
   * @description Removes the duplicated progress summary when the rail is expanded below the mobile progress control.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly compact: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property rows
   * @readonly
   * @description Each step's presentation joined with its resolved status.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OnboardingStepRailRow[]>}
   */
  protected readonly rows: Signal<readonly OnboardingStepRailRow[]> = computed<
    readonly OnboardingStepRailRow[]
  >(() => {
    const activeKey: OnboardingStepKey | null = this.activeStepKey();
    const steps: readonly OnboardingStepOutput[] = this.steps();
    const activeIndex: number = steps.findIndex((step) => step.key === activeKey);

    return steps.map((step: OnboardingStepOutput, index: number): OnboardingStepRailRow => {
      const presentation = ONBOARDING_STEP_PRESENTATION[step.key];
      const upcoming: boolean =
        step.status === 'blocked' && activeIndex !== -1 && index > activeIndex;
      const statusTag = resolveOnboardingStepStatusTag(upcoming ? 'pending' : step.status);

      return {
        key: step.key,
        label: presentation.label,
        sublabel: presentation.sublabel,
        icon: presentation.icon,
        statusIcon: statusTag.icon,
        statusLabel: statusTag.label,
        statusIconClass: ONBOARDING_STEP_STATUS_TAG_ICON_CLASS[statusTag.severity],
        isActive: step.key === activeKey,
        showSublabel: step.key === activeKey,
        statusLabelVisible: step.status === 'skipped' || (step.status === 'blocked' && !upcoming),
      };
    });
  });

  /**
   * Property progressLabel
   * @readonly
   * @description "N of M completed" readout, localized here rather than in the template so the two numeric placeholders keep stable, hand-auditable ids.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly progressLabel: Signal<string> = computed<string>(() => {
    const { done, total } = this.progress();

    return $localize`:@@onboarding.rail.progress:${done}:done: of ${total}:total: completed`;
  });
  //#endregion
}

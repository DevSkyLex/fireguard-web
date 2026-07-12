import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { InterventionStatus } from '@features/organization/features/interventions/models';
import type { InterventionPhaseStep } from './models';

/**
 * Component InterventionPhaseStepper
 * @class InterventionPhaseStepper
 *
 * @description
 * Presentational pipeline of the intervention's four macro phases
 * (preparation, execution, review, publication). Milestones before the
 * current status render as done, the current one as active and the rest as
 * upcoming; a published intervention shows every milestone done. State is
 * never conveyed by colour alone — each milestone pairs its colour with an
 * icon and a label.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-phase-stepper',
  templateUrl: './intervention-phase-stepper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPhaseStepper {
  //#region Inputs
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current workflow status driving each milestone's state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionStatus>}
   */
  public readonly status: InputSignal<InterventionStatus> = input.required<InterventionStatus>();

  /**
   * Property activeDetail
   * @readonly
   *
   * @description
   * Optional short detail rendered inside the active milestone's pill, such
   * as a `4/6` work-item counter during execution.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly activeDetail: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Derived state
  /**
   * Property steps
   * @readonly
   *
   * @description
   * The four macro-phase milestones with their progression state derived
   * from {@link status}. An abandoned intervention maps every milestone to
   * upcoming; callers hide the stepper in that case.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionPhaseStep[]>}
   */
  protected readonly steps: Signal<readonly InterventionPhaseStep[]> = computed<
    readonly InterventionPhaseStep[]
  >(() => {
    const activeIndex: number = this.activeIndex(this.status());
    const published: boolean = this.status() === 'published';

    const milestones: readonly Omit<InterventionPhaseStep, 'state'>[] = [
      {
        key: 'prepare',
        label: $localize`:@@intervention.phase.prepare:Preparation`,
        icon: 'pi pi-pencil',
      },
      {
        key: 'execute',
        label: $localize`:@@intervention.phase.execute:Execution`,
        icon: 'pi pi-compass',
      },
      {
        key: 'review',
        label: $localize`:@@intervention.phase.review:Review`,
        icon: 'pi pi-eye',
      },
      {
        key: 'publish',
        label: $localize`:@@intervention.phase.publish:Publication`,
        icon: 'pi pi-check-circle',
      },
    ];

    return milestones.map(
      (milestone, index): InterventionPhaseStep => ({
        key: milestone.key,
        label: milestone.label,
        icon: milestone.icon,
        state:
          published || index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming',
      }),
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method connectorClasses
   * @method connectorClasses
   *
   * @description
   * Connector colour classes for the segment following a milestone: green
   * once the milestone is done, muted otherwise.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionPhaseStep['state']} state - Preceding milestone state.
   *
   * @returns {string} Literal Tailwind class string.
   */
  protected connectorClasses(state: InterventionPhaseStep['state']): string {
    return state === 'done'
      ? 'bg-green-500 dark:bg-green-700'
      : 'bg-surface-200 dark:bg-surface-700';
  }

  /**
   * Method activeIndex
   * @method activeIndex
   *
   * @description
   * Maps a workflow status to the index of its macro phase; `-1` for
   * abandoned so every milestone reads upcoming.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionStatus} status - Current workflow status.
   *
   * @returns {number} Active milestone index.
   */
  private activeIndex(status: InterventionStatus): number {
    switch (status) {
      case 'draft':
        return 0;
      case 'planned':
      case 'in_progress':
      case 'changes_requested':
        return 1;
      case 'submitted':
        return 2;
      case 'published':
        return 3;
      default:
        return -1;
    }
  }
  //#endregion
}

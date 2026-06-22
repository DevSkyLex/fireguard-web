import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  InterventionPhase,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Type InterventionPhaseStepState
 * @typedef InterventionPhaseStepState
 *
 * @description
 * Visual state of a single workflow node: a phase already cleared (`done`), the
 * phase currently being worked (`current`), or a phase not yet reached
 * (`upcoming`).
 */
type InterventionPhaseStepState = 'done' | 'current' | 'upcoming';

/**
 * Interface InterventionPhaseStep
 * @interface InterventionPhaseStep
 *
 * @description
 * Pre-computed view model for one node of the workflow stepper, carrying both
 * its content (label, hint, icon) and the resolved Tailwind class strings for
 * its indicator, label and incoming connector so the template stays declarative.
 */
interface InterventionPhaseStep {
  /** Workflow phase this node represents. */
  readonly key: InterventionPhase;
  /** Short node label (e.g. `"Prepare"`). */
  readonly label: string;
  /** One-line description of the phase shown under the label on `sm+`. */
  readonly hint: string;
  /** PrimeIcons class rendered inside the node while it is not `done`. */
  readonly icon: string;
  /** Resolved visual state of the node. */
  readonly state: InterventionPhaseStepState;
  /** Class string for the indicator circle. */
  readonly indicatorClass: string;
  /** Class string for the node label text. */
  readonly labelClass: string;
  /** Class string for the connector leading into this node (empty for the first). */
  readonly connectorClass: string;
}

/**
 * Constant PHASE_ORDER
 * @const PHASE_ORDER
 *
 * @description
 * Canonical left-to-right ordering of the workflow phases, driving both the
 * rendered node sequence and the done/current/upcoming derivation.
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionPhase[]}
 */
const PHASE_ORDER: readonly InterventionPhase[] = ['prepare', 'execute', 'review'];

/**
 * Constant PHASE_META
 * @const PHASE_META
 *
 * @description
 * Static label, hint and icon for each workflow phase. An exhaustive record so
 * adding a phase to {@link InterventionPhase} forces a matching entry here.
 *
 * @since 1.0.0
 *
 * @type {Record<InterventionPhase, { label: string; hint: string; icon: string }>}
 */
const PHASE_META: Record<InterventionPhase, { label: string; hint: string; icon: string }> = {
  prepare: {
    label: $localize`:@@intervention.phase.prepare:Prepare`,
    hint: $localize`:@@intervention.phase.prepareHint:Plan scope & schedule`,
    icon: 'pi pi-clipboard',
  },
  execute: {
    label: $localize`:@@intervention.phase.execute:Execute`,
    hint: $localize`:@@intervention.phase.executeHint:Field work on site`,
    icon: 'pi pi-bolt',
  },
  review: {
    label: $localize`:@@intervention.phase.review:Review`,
    hint: $localize`:@@intervention.phase.reviewHint:Validate & publish`,
    icon: 'pi pi-verified',
  },
};

/**
 * Constant INDICATOR_CLASS
 * @const INDICATOR_CLASS
 *
 * @description
 * Indicator-circle classes per node state. The current node carries the brand
 * primary accent (reserved for the active step), cleared nodes are solid
 * primary, and upcoming nodes stay neutral.
 *
 * @since 1.0.0
 *
 * @type {Record<InterventionPhaseStepState, string>}
 */
const INDICATOR_CLASS: Record<InterventionPhaseStepState, string> = {
  done: 'bg-primary text-white',
  current: 'bg-primary/10 text-primary ring-1 ring-primary dark:bg-primary/15',
  upcoming:
    'bg-surface-0 text-surface-400 ring-1 ring-surface-300 dark:bg-surface-950 dark:text-surface-500 dark:ring-surface-700',
};

/**
 * Constant LABEL_CLASS
 * @const LABEL_CLASS
 *
 * @description
 * Node label text classes per state: emphasised for the current phase, dimmed
 * for cleared phases and muted for upcoming ones.
 *
 * @since 1.0.0
 *
 * @type {Record<InterventionPhaseStepState, string>}
 */
const LABEL_CLASS: Record<InterventionPhaseStepState, string> = {
  done: 'text-surface-600 dark:text-surface-300',
  current: 'font-semibold text-surface-900 dark:text-surface-50',
  upcoming: 'text-surface-400 dark:text-surface-500',
};

/**
 * Component InterventionPhaseStepper
 * @class InterventionPhaseStepper
 *
 * @description
 * Presentational, horizontal progress indicator for the three-phase
 * intervention workflow (Prepare → Execute → Review). It derives each node's
 * done/current/upcoming state from the active {@link InterventionPhase} and the
 * intervention {@link InterventionStatus} (a `published` intervention marks the
 * whole workflow complete), giving the workspace a consistent orientation cue
 * across all three phase panels. It owns no state and emits no events — the
 * parent page drives the inputs.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-phase-stepper [phase]="phase()" [status]="intervention.status" />
 * ```
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
   * Property phase
   * @readonly
   *
   * @description
   * Active workflow phase, selecting the current node and partitioning the
   * remaining nodes into cleared and upcoming.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionPhase>}
   */
  public readonly phase: InputSignal<InterventionPhase> = input.required<InterventionPhase>();

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current intervention status. Only `published` changes the rendering beyond
   * the phase: it marks every node (including review) as cleared so a finished
   * workflow reads as fully complete rather than "review in progress".
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionStatus>}
   */
  public readonly status: InputSignal<InterventionStatus> = input.required<InterventionStatus>();
  //#endregion

  //#region Properties
  /**
   * Property steps
   * @readonly
   *
   * @description
   * The three workflow nodes, each resolved to its state and ready-to-render
   * class strings. The connector leading into a node is filled once the
   * preceding node is cleared, so the primary accent tracks real progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionPhaseStep[]>}
   */
  protected readonly steps: Signal<readonly InterventionPhaseStep[]> = computed<
    readonly InterventionPhaseStep[]
  >(() => {
    const complete: boolean = this.status() === 'published';
    const currentIndex: number = PHASE_ORDER.indexOf(this.phase());

    const states: readonly InterventionPhaseStepState[] = PHASE_ORDER.map(
      (_: InterventionPhase, index: number): InterventionPhaseStepState => {
        if (complete || index < currentIndex) return 'done';
        if (index === currentIndex) return 'current';
        return 'upcoming';
      },
    );

    return PHASE_ORDER.map((key: InterventionPhase, index: number): InterventionPhaseStep => {
      const state: InterventionPhaseStepState = states[index];
      const previousDone: boolean = index > 0 && states[index - 1] === 'done';

      return {
        key,
        label: PHASE_META[key].label,
        hint: PHASE_META[key].hint,
        icon: PHASE_META[key].icon,
        state,
        indicatorClass: INDICATOR_CLASS[state],
        labelClass: LABEL_CLASS[state],
        connectorClass: previousDone ? 'bg-primary' : 'bg-surface-200 dark:bg-surface-800',
      };
    });
  });
  //#endregion
}

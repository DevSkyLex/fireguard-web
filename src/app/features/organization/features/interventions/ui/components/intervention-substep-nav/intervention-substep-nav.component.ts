import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  viewChildren,
  type ElementRef,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import type { InterventionSubstep } from './models';

/**
 * Component InterventionSubstepNav
 * @class InterventionSubstepNav
 *
 * @description
 * Presentational segmented control that navigates the micro-steps of a workflow
 * phase. Implemented as an ARIA tablist with roving tabindex: exactly one segment
 * is tabbable, and Arrow/Home/End move focus and activate the target step
 * (automatic activation), matching the workspace's keyboard-navigable workflow.
 * The active step is a two-way `model` so a parent panel binds it to its
 * `subStep` signal. It owns no business state — steps and selection come from the
 * parent.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-substep-nav [steps]="steps" [(active)]="subStep" ariaLabel="Preparation steps" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-substep-nav',
  templateUrl: './intervention-substep-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSubstepNav {
  //#region Inputs
  /**
   * Property steps
   * @readonly
   *
   * @description
   * Ordered micro-steps rendered as segments.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionSubstep[]>}
   */
  public readonly steps: InputSignal<readonly InterventionSubstep[]> =
    input.required<readonly InterventionSubstep[]>();

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible label for the tablist, naming the phase the steps belong to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input.required<string>();

  /**
   * Property active
   * @readonly
   *
   * @description
   * Two-way bound key of the active step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ModelSignal<string>}
   */
  public readonly active: ModelSignal<string> = model.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property tabs
   * @readonly
   *
   * @description
   * References to the rendered tab buttons, used to move focus during roving
   * keyboard navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<readonly ElementRef<HTMLButtonElement>[]>}
   */
  private readonly tabs: Signal<readonly ElementRef<HTMLButtonElement>[]> =
    viewChildren<ElementRef<HTMLButtonElement>>('tab');

  /**
   * Property activeIndex
   * @readonly
   *
   * @description
   * Index of the active step within {@link steps}; `0` when the key is unknown.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly activeIndex: Signal<number> = computed<number>(() => {
    const index: number = this.steps().findIndex(
      (step: InterventionSubstep): boolean => step.key === this.active(),
    );
    return index === -1 ? 0 : index;
  });
  //#endregion

  //#region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * Activates the step at the given index and returns focus to its button so
   * keyboard and pointer selection stay in sync.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Target step index.
   *
   * @returns {void}
   */
  protected select(index: number): void {
    const steps: readonly InterventionSubstep[] = this.steps();
    const bounded: number = Math.max(0, Math.min(index, steps.length - 1));
    const step: InterventionSubstep | undefined = steps[bounded];
    if (!step) return;
    this.active.set(step.key);
    this.tabs()[bounded]?.nativeElement.focus();
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * Handles roving-tabindex keyboard navigation on the tablist: Arrow keys move
   * to the previous/next step (wrapping), Home/End jump to the first/last, each
   * activating the target step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - Keydown event on the tablist.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    const count: number = this.steps().length;
    if (count === 0) return;

    const current: number = this.activeIndex();
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % count;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(next);
  }
  //#endregion
}

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
import { SkeletonModule } from 'primeng/skeleton';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import {
  InterventionPriorityIcon,
  InterventionTag,
} from '@features/organization/features/interventions/ui/components';

/**
 * Component OrganizationTodayQueue
 * @class OrganizationTodayQueue
 *
 * @description
 * One named work queue of the landing page: a heading saying what is waiting
 * and how much of it, then the first few interventions concerned.
 *
 * Presentational (ARCHITECTURE.md §10.3). The secondary line of a row is a
 * `notes` entry rather than something derived here, because what matters
 * differs per queue — days overdue, pending local changes — and the wording is
 * the page's to localize.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today-queue',
  imports: [ButtonModule, SkeletonModule, InterventionTag, InterventionPriorityIcon],
  templateUrl: './organization-today-queue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTodayQueue {
  //#region Inputs
  /**
   * Property label
   * @readonly
   *
   * @description
   * Heading of the queue, already localized.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property total
   * @readonly
   *
   * @description
   * How many interventions answer this question organization-wide. Not
   * `interventions().length`: the queue shows a handful and says how many
   * there are.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly total: InputSignal<number> = input.required<number>();

  /**
   * Property interventions
   * @readonly
   *
   * @description
   * The rows to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> = input<
    readonly InterventionOutput[]
  >([]);

  /**
   * Property notes
   * @readonly
   *
   * @description
   * Localized secondary line per intervention id. A row without an entry
   * renders no second line.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, string>>>}
   */
  public readonly notes: InputSignal<Readonly<Record<string, string>>> = input<
    Readonly<Record<string, string>>
  >({});

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the queue is still resolving.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property actionLabel
   * @readonly
   *
   * @description
   * Localized label of the trailing action. The action is rendered only when a
   * label is given.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly actionLabel: InputSignal<string | undefined> = input<string>();
  //#endregion

  //#region Outputs
  /**
   * Property opened
   * @readonly
   *
   * @description
   * A row was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly opened: OutputEmitterRef<InterventionOutput> = output<InterventionOutput>();

  /**
   * Property actioned
   * @readonly
   *
   * @description
   * The trailing action was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly actioned: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Derived
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the queue is worth rendering at all. An empty queue says nothing
   * an operator needs; the page owns the all-clear message instead.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly visible: Signal<boolean> = computed<boolean>(
    () => this.loading() || this.total() > 0,
  );
  //#endregion
}

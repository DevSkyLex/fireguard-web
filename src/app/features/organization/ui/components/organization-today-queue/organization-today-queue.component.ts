import type { BooleanInput } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideCircleCheck } from '@ng-icons/lucide';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component OrganizationTodayQueue
 * @class OrganizationTodayQueue
 *
 * @description
 * One named work queue on the landing page: a heading, how many there are in
 * total, and a handful of the interventions themselves. The count beside the
 * heading is the organization-wide total, not the number of rows shown — the
 * queue shows a sample and says how many there are.
 *
 * Purely presentational: it takes the queue as inputs and emits what the
 * operator picked. It injects no store and calls no service — the page owns
 * orchestration (`ARCHITECTURE.md` §10.3).
 *
 * Standalone (the default), a queue that is empty and not loading renders
 * nothing at all: four empty boxes stacked down the page say less than their
 * absence. {@link embedded} is for the opposite context — composed inside a
 * page-owned card that already renders the heading, total and "see all"
 * action itself (`OrganizationTodayPage`'s "Your work queues" card): the
 * component then renders only its list body, and an empty, settled queue
 * shows one muted "all clear" row instead of disappearing, so the file stays
 * visible next to its siblings.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-organization-today-queue
 *   label="Overdue"
 *   [total]="store.overdue().total"
 *   [interventions]="store.overdue().items"
 *   (opened)="openIntervention($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today-queue',
  imports: [NgIcon, NgTemplateOutlet, HlmButton, HlmSkeleton],
  providers: [provideIcons({ lucideChevronRight, lucideCircleCheck })],
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
   * The question this queue answers, already localized by the page.
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
   * How many interventions the queue holds organization-wide.
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
   * The sample of rows to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Property notes
   * @readonly
   *
   * @description
   * Optional secondary line per intervention id, localized by the page — how
   * late it is, or how many local changes are queued.
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
   * Optional label for the see-all control. Absent means no control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly actionLabel: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property embedded
   * @readonly
   *
   * @description
   * Renders only the list body — no `<section>` wrapper, no own heading,
   * total or "see all" action — for composition inside a page-owned card
   * that already renders those. An empty, settled queue then shows one
   * muted "all clear" row rather than disappearing, since the surrounding
   * card still needs every file to stay visible.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly embedded: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });
  //#endregion

  //#region Outputs
  /**
   * Property opened
   * @readonly
   *
   * @description
   * Emits the intervention the operator picked.
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
   * Emits when the see-all control is used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly actioned: OutputEmitterRef<void> = output<void>();
  //#endregion
}

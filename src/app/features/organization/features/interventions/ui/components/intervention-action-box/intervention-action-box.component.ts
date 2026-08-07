import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarCheck,
  lucideCircleCheckBig,
  lucideListChecks,
  lucideLock,
  lucideSend,
} from '@ng-icons/lucide';
import type {
  InterventionCommandAction,
  InterventionIssueOutput,
  InterventionPhase,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { InterventionPublicationSummary } from '../intervention-publication-summary';

/**
 * Component InterventionActionBox
 * @class InterventionActionBox
 *
 * @description
 * The single host for the current phase's forward action, rendered exactly
 * once regardless of phase — a fixed address on the page instead of a
 * button that used to jump between three tab panels. The box's *content*
 * still changes with the phase (a plan/submit label, the publication recap
 * and its blockers, or a locked terminal state once published); its
 * *position* never does.
 *
 * `published` is checked ahead of `phase() === 'review'`: both a submitted
 * intervention still awaiting publication and a published one map to the
 * `review` phase, but only the latter is a terminal state with no button —
 * hence the explicit `status` input alongside `phase`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-action-box
 *   [action]="commandAction()"
 *   [phase]="phase()"
 *   [status]="intervention.status"
 *   [blockers]="blockerIssues()"
 *   [pendingChanges]="pendingChangesCount()"
 *   [inspections]="intervention.inspectionsCount"
 *   [revision]="intervention.revision"
 *   [busy]="store.saving()"
 *   (invoked)="invokeCommandAction()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-action-box',
  imports: [NgIcon, HlmButton, InterventionPublicationSummary, ...HlmAlertImports],
  providers: [
    provideIcons({
      lucideCalendarCheck,
      lucideCircleCheckBig,
      lucideListChecks,
      lucideLock,
      lucideSend,
    }),
  ],
  templateUrl: './intervention-action-box.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionActionBox {
  //#region Inputs
  /**
   * Property action
   * @readonly
   * @description The current phase's forward action, or null when there is nothing to do.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionCommandAction | null>}
   */
  public readonly action: InputSignal<InterventionCommandAction | null> =
    input<InterventionCommandAction | null>(null);

  /**
   * Property phase
   * @readonly
   * @description Where the intervention sits in its lifecycle.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionPhase>}
   */
  public readonly phase: InputSignal<InterventionPhase> = input.required<InterventionPhase>();

  /**
   * Property status
   * @readonly
   * @description The raw status, which is what distinguishes "submitted" from "published" inside the review phase.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionStatus | null>}
   */
  public readonly status: InputSignal<InterventionStatus | null> = input<InterventionStatus | null>(
    null,
  );

  /**
   * Property blockers
   * @readonly
   * @description The blocking compliance issues, shown only in the review phase.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionIssueOutput[]>}
   */
  public readonly blockers: InputSignal<readonly InterventionIssueOutput[]> = input<
    readonly InterventionIssueOutput[]
  >([]);

  /**
   * Property pendingChanges
   * @readonly
   * @description How many proposed changes publication would apply.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly pendingChanges: InputSignal<number> = input<number>(0);

  /**
   * Property inspections
   * @readonly
   * @description How many inspections the intervention recorded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly inspections: InputSignal<number> = input<number>(0);

  /**
   * Property revision
   * @readonly
   * @description The revision publication is pinned to, or the one it locked at once published.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly revision: InputSignal<number> = input<number>(0);

  /**
   * Property busy
   * @readonly
   * @description Whether a write is already in flight, disabling the action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property invoked
   * @readonly
   * @description The operator activated the phase's forward action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly invoked: OutputEmitterRef<void> = output<void>();
  //#endregion
}

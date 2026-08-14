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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheckBig, lucideLock, lucideMessageSquareQuote } from '@ng-icons/lucide';
import type {
  InterventionCommandAction,
  InterventionPhase,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { InterventionCommandButton } from '../intervention-command-button';
import { InterventionTag } from '../intervention-tag';

/**
 * Phase labels, indexed by {@link InterventionPhase}. Kept local rather than
 * folded into the feature's `intervention-tag` registry: the band renders it
 * as plain text, never as a badge, and it has no severity or icon to resolve.
 */
const PHASE_LABEL: Readonly<Record<InterventionPhase, string>> = {
  prepare: $localize`:@@intervention.band.phase.prepare:Preparation`,
  execute: $localize`:@@intervention.band.phase.execute:Field work`,
  review: $localize`:@@intervention.band.phase.review:Review`,
};

/**
 * Component InterventionStatusBand
 * @class InterventionStatusBand
 *
 * @description
 * The single next-action surface of the intervention detail workspace: status,
 * phase, blockers and the phase's forward action in one sticky band, replacing
 * the separate desk-only action box and the mobile-only command bar. One
 * implementation now serves both viewports instead of two hosts rendering the
 * same `InterventionCommandButton` from the same signals.
 *
 * The published state replaces the button with a locked terminal line; a
 * `changes_requested` status with a reviewer note renders as a second row
 * beneath the band rather than competing with the command row for width.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-status-band
 *   [status]="intervention.status"
 *   [phase]="phase()"
 *   [action]="commandAction()"
 *   [busy]="store.saving()"
 *   [blockersCount]="blockerIssues().length"
 *   [revision]="intervention.revision"
 *   [reviewNote]="intervention.reviewNote"
 *   (invoked)="invokeCommandAction()"
 *   (blockersRequested)="revealBlockers()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-status-band',
  imports: [NgIcon, HlmButton, InterventionCommandButton, InterventionTag, ...HlmAlertImports],
  providers: [provideIcons({ lucideCircleCheckBig, lucideLock, lucideMessageSquareQuote })],
  host: {
    class:
      'sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6',
    'data-testid': 'intervention-detail-status-band',
  },
  templateUrl: './intervention-status-band.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionStatusBand {
  //#region Inputs
  /**
   * Property status
   * @readonly
   * @description The current workflow status, driving the status tag and the published terminal state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionStatus>}
   */
  public readonly status: InputSignal<InterventionStatus> = input.required<InterventionStatus>();

  /**
   * Property phase
   * @readonly
   * @description Where the intervention sits in its lifecycle, rendered as the phase label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionPhase>}
   */
  public readonly phase: InputSignal<InterventionPhase> = input.required<InterventionPhase>();

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
   * Property busy
   * @readonly
   * @description Whether a write is already in flight, disabling the action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property blockersCount
   * @readonly
   * @description How many blocking compliance issues stand between the intervention and publication.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly blockersCount: InputSignal<number> = input<number>(0);

  /**
   * Property revision
   * @readonly
   * @description The revision the intervention published and locked at.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly revision: InputSignal<number> = input<number>(0);

  /**
   * Property reviewNote
   * @readonly
   * @description The reviewer's note, shown only alongside a `changes_requested` status.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly reviewNote: InputSignal<string | null> = input<string | null>(null);
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

  /**
   * Property blockersRequested
   * @readonly
   * @description The operator asked to see what is blocking publication.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly blockersRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Computed
  /**
   * Property phaseLabel
   * @readonly
   * @description The current phase, resolved to its display label.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly phaseLabel: Signal<string> = computed<string>(() => PHASE_LABEL[this.phase()]);

  /**
   * Property showReviewNote
   * @readonly
   * @description Whether the reviewer's note strip should render.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly showReviewNote: Signal<boolean> = computed<boolean>(
    () => this.status() === 'changes_requested' && this.reviewNote() !== null,
  );
  //#endregion
}

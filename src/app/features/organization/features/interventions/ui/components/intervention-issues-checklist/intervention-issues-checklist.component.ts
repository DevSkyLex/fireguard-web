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
import { lucideChevronRight, lucideCircleCheck } from '@ng-icons/lucide';
import type {
  InterventionIssueOutput,
  InterventionIssueTarget,
  InterventionPhase,
} from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { InterventionTag } from '../intervention-tag';
import { resolveInterventionIssueTarget } from './utils/intervention-issue-target/intervention-issue-target.utils';

/**
 * Component InterventionIssuesChecklist
 * @class InterventionIssuesChecklist
 *
 * @description
 * Every publication issue as a direct address rather than a message to
 * decode: each blocker and warning is a button that sends the operator to
 * the tab or editor that resolves it, resolved by
 * `resolveInterventionIssueTarget` from the issue's own `resource`/`field`
 * pair. Blockers render first — the only issues that actually stop publication
 * should never be a click away from visible. Warnings and recommendations
 * render directly beneath them because they remain useful context while an
 * intervention is being resolved.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-issues-checklist
 *   [issues]="store.issues()"
 *   [phase]="phase()"
 *   (activated)="onIssueActivated($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-issues-checklist',
  imports: [...HlmItemImports, NgIcon, HlmButton, InterventionTag],
  providers: [provideIcons({ lucideChevronRight, lucideCircleCheck })],
  templateUrl: './intervention-issues-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionIssuesChecklist {
  /**
   * Property loading
   * @readonly
   * @description Whether the current section is waiting for its data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading = input(false);
  /**
   * Property error
   * @readonly
   * @description Server or validation error retained beside the current draft.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error = input<string | null>(null);
  /**
   * Property retryRequested
   * @readonly
   * @description Requests another verification of the current issues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested = output<void>();
  /**
   * Property verified
   * @readonly
   * @description True only after successful verification against the server.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly verified: InputSignal<boolean> = input(false);
  //#region Inputs
  /**
   * Property issues
   * @readonly
   * @description Every publication issue currently loaded, of any severity.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionIssueOutput[]>}
   */
  public readonly issues: InputSignal<readonly InterventionIssueOutput[]> = input<
    readonly InterventionIssueOutput[]
  >([]);

  /**
   * Property phase
   * @readonly
   *
   * @description
   * Where the intervention sits in its lifecycle — decides only whether an
   * empty blocker list renders its positive line, which only means something
   * once the intervention is under review.
   *
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionPhase>}
   */
  public readonly phase: InputSignal<InterventionPhase> = input.required<InterventionPhase>();
  //#endregion

  //#region Outputs
  /**
   * Property activated
   * @readonly
   * @description The operator picked an issue to act on.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionIssueTarget>}
   */
  public readonly activated: OutputEmitterRef<InterventionIssueTarget> =
    output<InterventionIssueTarget>();
  //#endregion

  //#region Properties
  /**
   * Property blockers
   * @readonly
   * @description The issues that actually stop publication, unfolded above the rest.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionIssueOutput[]>}
   */
  protected readonly blockers: Signal<readonly InterventionIssueOutput[]> = computed<
    readonly InterventionIssueOutput[]
  >(() => this.issues().filter((issue) => issue.severity === 'blocker'));

  /**
   * Property secondaryIssues
   * @readonly
   * @description Warnings and recommendations — informative and rendered beneath blockers.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionIssueOutput[]>}
   */
  protected readonly secondaryIssues: Signal<readonly InterventionIssueOutput[]> = computed<
    readonly InterventionIssueOutput[]
  >(() => this.issues().filter((issue) => issue.severity !== 'blocker'));

  /**
   * Property showClearNotice
   * @readonly
   * @description Whether the positive "no blockers" line renders — under review, with nothing blocking.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly showClearNotice: Signal<boolean> = computed<boolean>(
    () => this.verified() && this.phase() === 'review' && this.blockers().length === 0,
  );

  //#endregion

  //#region Methods
  /**
   * Method activate
   * @description Resolves and emits where the issue should send the operator.
   * @access protected
   * @since 1.0.0
   * @param {InterventionIssueOutput} issue - The activated issue.
   * @returns {void}
   */
  protected activate(issue: InterventionIssueOutput): void {
    this.activated.emit(resolveInterventionIssueTarget(issue));
  }
  //#endregion
}

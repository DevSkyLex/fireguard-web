import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronRight, lucideCircleCheck } from '@ng-icons/lucide';
import type {
  InterventionIssueOutput,
  InterventionIssueTarget,
  InterventionPhase,
} from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
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
 * pair. Blockers render first, unfolded — the only issues that actually stop
 * publication should never be a click away from visible. Warnings and
 * recommendations sit in a collapsed section beneath: informative, not
 * gating, and worth folding away once the blocker list is clear.
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
  imports: [NgIcon, HlmButton, InterventionTag, ...HlmCollapsibleImports],
  providers: [provideIcons({ lucideChevronDown, lucideChevronRight, lucideCircleCheck })],
  templateUrl: './intervention-issues-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionIssuesChecklist {
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
   * Property secondaryExpanded
   * @readonly
   * @description Whether the collapsed warnings/recommendations section is open.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly secondaryExpanded: WritableSignal<boolean> = signal<boolean>(false);

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
   * @description Warnings and recommendations — informative, not gating, and kept collapsed.
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
    () => this.phase() === 'review' && this.blockers().length === 0,
  );

  /**
   * Property secondaryToggleLabel
   * @readonly
   * @description The collapsed section's trigger label, counting its own issues.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly secondaryToggleLabel: Signal<string> = computed<string>(() => {
    const count: number = this.secondaryIssues().length;

    return count === 1
      ? $localize`:@@intervention.issues.secondaryToggleOne:1 point to review`
      : $localize`:@@intervention.issues.secondaryToggleMany:${count}:count: points to review`;
  });
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

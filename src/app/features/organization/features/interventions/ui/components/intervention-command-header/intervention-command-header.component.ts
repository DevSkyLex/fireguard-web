import { DatePipe } from '@angular/common';
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
import type {
  InterventionOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '@features/organization/features/interventions/ui/components/intervention-member-option/intervention-member-option.component';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import type { InterventionCommandAction } from './models';

/**
 * Constant TERMINAL_STATUSES
 * @const TERMINAL_STATUSES
 *
 * @description
 * Statuses for which a past due date is no longer actionable, so the header
 * suppresses the overdue signal.
 *
 * @since 1.0.0
 *
 * @type {ReadonlySet<string>}
 */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['published', 'abandoned']);

/**
 * Component InterventionCommandHeader
 * @class InterventionCommandHeader
 *
 * @description
 * Compact, presentational identity band crowning the intervention workspace. It
 * answers, at a glance, "what is this intervention, where is it, and what is the
 * single next step?": the name, status/priority/type tags, the responsible agent,
 * the site, the planned start and due date (flagging overdue work), a slim
 * work-item progress meter, and the one canonical forward action for the current
 * phase. It is deliberately not a hero-metric block — no oversized number. It
 * owns no state; the parent page derives every input and handles the action.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-command-header
 *   [intervention]="intervention"
 *   [responsibleMember]="responsibleMember()"
 *   [siteLabel]="siteLabel()"
 *   [action]="commandAction()"
 *   (actionInvoke)="planIntervention()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-command-header',
  imports: [ButtonModule, DatePipe, InterventionMemberOption, InterventionTag],
  templateUrl: './intervention-command-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCommandHeader {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Intervention whose identity, status and progress the header renders.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property responsibleMember
   * @readonly
   *
   * @description
   * Resolved member option for the responsible agent, or null when unassigned.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MemberSelectOption | null>}
   */
  public readonly responsibleMember: InputSignal<MemberSelectOption | null> =
    input<MemberSelectOption | null>(null);

  /**
   * Property siteLabel
   * @readonly
   *
   * @description
   * Resolved site label, or null when no site is assigned.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly siteLabel: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property action
   * @readonly
   *
   * @description
   * The single canonical forward action for the current phase, or null when no
   * action is available to the current user.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionCommandAction | null>}
   */
  public readonly action: InputSignal<InterventionCommandAction | null> =
    input<InterventionCommandAction | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property actionInvoke
   * @readonly
   *
   * @description
   * Emits when the user triggers the canonical forward action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly actionInvoke: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property hasWorkItems
   * @readonly
   *
   * @description
   * Whether the intervention has any work items, gating the progress meter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasWorkItems: Signal<boolean> = computed<boolean>(
    () => (this.intervention().workItemsCount ?? 0) > 0,
  );

  /**
   * Property progressPercent
   * @readonly
   *
   * @description
   * Completed-vs-total work-item progress as a 0–100 integer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly progressPercent: Signal<number> = computed<number>(() => {
    const intervention: InterventionOutput = this.intervention();
    const total: number = intervention.workItemsCount ?? 0;
    if (total <= 0) return 0;
    const completed: number = intervention.completedWorkItemsCount ?? 0;
    return Math.round((Math.min(completed, total) / total) * 100);
  });

  /**
   * Property isOverdue
   * @readonly
   *
   * @description
   * Whether the due date has passed while the intervention is still active,
   * driving the overdue emphasis on the due date.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isOverdue: Signal<boolean> = computed<boolean>(() => {
    const intervention: InterventionOutput = this.intervention();
    if (!intervention.dueAt || TERMINAL_STATUSES.has(intervention.status)) return false;
    return new Date(intervention.dueAt).getTime() < Date.now();
  });
  //#endregion
}

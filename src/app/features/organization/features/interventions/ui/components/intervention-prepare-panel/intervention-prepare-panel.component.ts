import { DatePipe } from '@angular/common';
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
import { ButtonModule } from 'primeng/button';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  InterventionPlanningDetails,
  InterventionWorkItemOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '@features/organization/features/interventions/ui/components/intervention-member-option/intervention-member-option.component';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import {
  InterventionPlanningForm,
  InterventionWorkItemForm,
  type InterventionPlanningFormValues,
  type InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { Card } from '@shared/components';

/**
 * Interface PrepareReadinessCheck
 * @interface PrepareReadinessCheck
 *
 * @description
 * One planning-readiness condition rendered in the rail checklist.
 */
interface PrepareReadinessCheck {
  /** Human-readable condition label. */
  readonly label: string;
  /** Whether the condition is currently satisfied. */
  readonly done: boolean;
}

/**
 * Component InterventionPreparePanel
 * @class InterventionPreparePanel
 *
 * @description
 * Renders the intervention preparation (draft) phase as a two-column workspace:
 * a document-style main column (title, guidance, work items, activity) and a
 * read-only properties rail (status, priority, people, site, schedule) ending
 * in a planning-readiness checklist and the "Plan intervention" action. Editing
 * is delegated to the planning and work-item forms hosted in side drawers; all
 * persistence and navigation stay with the parent page through outputs.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-prepare-panel',
  imports: [
    ButtonModule,
    Card,
    DatePipe,
    DrawerModule,
    InterventionMemberOption,
    InterventionPlanningForm,
    InterventionTag,
    InterventionWorkItemForm,
  ],
  templateUrl: './intervention-prepare-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPreparePanel {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Intervention being prepared; drives the header, properties and readiness.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Planned work items listed in the scope section.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Whether a planning or work-item save is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canPlan
   * @readonly
   *
   * @description
   * Whether the current user may edit planning details and add work items.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPlan: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Available site selector options, used to resolve the site label and feed
   * the planning form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> =
    input.required<readonly SelectOption[]>();

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Available member selector options, used to resolve responsible/participant
   * display and feed planning and work-item forms.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> =
    input.required<readonly MemberSelectOption[]>();

  /**
   * Property targetOptions
   * @readonly
   *
   * @description
   * Available target selector options forwarded to {@link InterventionWorkItemForm}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> =
    input.required<readonly SelectOption[]>();
  //#endregion

  //#region Outputs
  /**
   * Property planIntervention
   * @readonly
   *
   * @description
   * Emits when the user confirms planning and transitions the intervention
   * to `planned` status.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly planIntervention: OutputEmitterRef<void> = output<void>();

  /**
   * Property saveDetails
   * @readonly
   *
   * @description
   * Emits validated planning details when the planning form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionPlanningDetails>}
   */
  public readonly saveDetails: OutputEmitterRef<InterventionPlanningDetails> =
    output<InterventionPlanningDetails>();

  /**
   * Property createWorkItem
   * @readonly
   *
   * @description
   * Emits a new work item payload when the work-item form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CreateInterventionWorkItemInput>}
   */
  public readonly createWorkItem: OutputEmitterRef<CreateInterventionWorkItemInput> =
    output<CreateInterventionWorkItemInput>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through sizing the add-work-item drawer: full width on
   * mobile, compact on larger viewports.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full sm:!w-[34rem]' },
  };

  /**
   * Property editDrawerPt
   * @readonly
   *
   * @description
   * PrimeNG drawer pass-through sizing the planning-details edit drawer to
   * match the creation drawer: full width on mobile, widening on larger
   * viewports to give the two-column form room.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly editDrawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full md:!w-[52rem] xl:!w-[60rem]' },
  };

  /**
   * Property editDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the planning details edit drawer.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property workItemDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the add-work-item drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly workItemDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property siteLabel
   * @readonly
   *
   * @description
   * Resolved label of the intervention site, or null when none is set.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly siteLabel: Signal<string | null> = computed<string | null>(() => {
    const site: string | null = this.intervention().site;
    if (!site) return null;

    return (
      this.siteOptions().find((option: SelectOption): boolean => option.value === site)?.label ??
      null
    );
  });

  /**
   * Property responsibleMember
   * @readonly
   *
   * @description
   * Resolved member option for the responsible agent, or null when unassigned.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly responsibleMember: Signal<MemberSelectOption | null> =
    computed<MemberSelectOption | null>(() => {
      const responsible: string | null = this.intervention().responsible;
      if (!responsible) return null;

      return (
        this.memberOptions().find(
          (option: MemberSelectOption): boolean => option.value === responsible,
        ) ?? null
      );
    });

  /**
   * Property participantMembers
   * @readonly
   *
   * @description
   * Resolved member options for the intervention participants.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly participantMembers: Signal<readonly MemberSelectOption[]> = computed<
    readonly MemberSelectOption[]
  >(() => {
    const members: readonly MemberSelectOption[] = this.memberOptions();

    return this.intervention()
      .participants.map((iri: string): MemberSelectOption | undefined =>
        members.find((option: MemberSelectOption): boolean => option.value === iri),
      )
      .filter((member: MemberSelectOption | undefined): member is MemberSelectOption => !!member);
  });

  /**
   * Property progressValue
   * @readonly
   *
   * @description
   * Completion percentage of the planned work items, used by the scope header.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly progressValue: Signal<number> = computed<number>(() => {
    const total: number = this.intervention().workItemsCount;
    if (total <= 0) return 0;

    return Math.round((this.intervention().completedWorkItemsCount / total) * 100);
  });

  /**
   * Property readinessChecks
   * @readonly
   *
   * @description
   * The three planning-readiness conditions surfaced in the rail checklist.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly PrepareReadinessCheck[]>}
   */
  protected readonly readinessChecks: Signal<readonly PrepareReadinessCheck[]> = computed<
    readonly PrepareReadinessCheck[]
  >(() => {
    const intervention: InterventionOutput = this.intervention();

    return [
      {
        label: 'Single site & responsible',
        done: !!intervention.site && !!intervention.responsible,
      },
      {
        label: 'Schedule window set',
        done: !!intervention.plannedStartAt && !!intervention.dueAt,
      },
      { label: 'Add at least one work item', done: this.workItems().length > 0 },
    ];
  });

  /**
   * Property readyCount
   * @readonly
   *
   * @description
   * Number of satisfied readiness conditions, shown as the rail's `N / 3` badge.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly readyCount: Signal<number> = computed<number>(
    () =>
      this.readinessChecks().filter((check: PrepareReadinessCheck): boolean => check.done).length,
  );

  /**
   * Property canSubmitPlan
   * @readonly
   *
   * @description
   * Whether planning can be confirmed: the user may plan, the intervention is
   * still a draft, and the hard conditions (site, responsible, schedule) are met.
   * Work items remain a soft recommendation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmitPlan: Signal<boolean> = computed<boolean>(() => {
    const intervention: InterventionOutput = this.intervention();

    return (
      this.canPlan() &&
      intervention.status === 'draft' &&
      !!intervention.site &&
      !!intervention.responsible &&
      !!intervention.plannedStartAt &&
      !!intervention.dueAt
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method savePlanningDetails
   * @method savePlanningDetails
   *
   * @description
   * Maps {@link InterventionPlanningForm} values to a planning-details payload,
   * emits them via {@link saveDetails} and closes the edit drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionPlanningFormValues} values - Planning form values.
   *
   * @returns {void}
   */
  protected savePlanningDetails(values: InterventionPlanningFormValues): void {
    this.saveDetails.emit({
      site: values.site,
      responsible: values.responsible,
      participants: values.participants,
      priority: values.priority,
      plannedStartAt: values.plannedStartAt,
      dueAt: values.dueAt,
    });
    this.editDrawerVisible.set(false);
  }

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Maps {@link InterventionWorkItemForm} values to a work-item input payload,
   * emits it via {@link createWorkItem} and closes the drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionWorkItemFormValues} values - Work item form values.
   *
   * @returns {void}
   */
  protected addWorkItem(values: InterventionWorkItemFormValues): void {
    this.createWorkItem.emit({
      intervention: `/api/interventions/${this.intervention().id}`,
      action: values.action,
      target: values.target.trim() || null,
      assignee: values.assignee || null,
      source: 'planned',
      required: true,
    });
    this.workItemDrawerVisible.set(false);
  }

  /**
   * Method workItemAssignee
   * @method workItemAssignee
   *
   * @description
   * Resolves the member option assigned to a work item, or null when the item
   * is unassigned, so the row can show who owns the task.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {MemberSelectOption | null} Assigned member option, if any.
   */
  protected workItemAssignee(item: InterventionWorkItemOutput): MemberSelectOption | null {
    if (!item.assignee) return null;

    return (
      this.memberOptions().find(
        (option: MemberSelectOption): boolean => option.value === item.assignee,
      ) ?? null
    );
  }

  /**
   * Method workItemTarget
   * @method workItemTarget
   *
   * @description
   * Resolves a human-readable target label for a work item: the matching
   * target option label when known, the raw value when it is free text, and
   * null for unresolved resource IRIs (which are not useful to the user).
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {InterventionWorkItemOutput} item - Work item to resolve.
   *
   * @returns {string | null} Display label, or null when nothing useful to show.
   */
  protected workItemTarget(item: InterventionWorkItemOutput): string | null {
    const target: string | null = item.target;
    if (!target) return null;

    const option: SelectOption | undefined = this.targetOptions().find(
      (candidate: SelectOption): boolean => candidate.value === target,
    );
    if (option) return option.label;

    return target.startsWith('/api/') ? null : target;
  }
  //#endregion
}

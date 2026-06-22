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
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
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
  InterventionEditDrawer,
  InterventionWorkItemDrawer,
} from '@features/organization/features/interventions/ui/drawers';
import type {
  InterventionPlanningFormValues,
  InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { InterventionWorkItemTable } from '@features/organization/features/interventions/ui/tables/intervention-work-item-table';
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
 * Constant PARTICIPANT_AVATAR_LIMIT
 * @const PARTICIPANT_AVATAR_LIMIT
 *
 * @description
 * Maximum number of participant avatars rendered in the stacked avatar group
 * before the remainder collapses into a single "+N" overflow avatar.
 *
 * @since 2.1.0
 *
 * @type {number}
 */
const PARTICIPANT_AVATAR_LIMIT = 5;

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
 * persistence and navigation stay with the parent page through outputs. The
 * primary "Plan intervention" action is surfaced as a workspace action bar
 * (a tinted action band on desktop, a thumb-zone bottom bar on field viewports)
 * with the readiness checklist demoted to supporting detail in the rail.
 *
 * @version 2.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-prepare-panel',
  imports: [
    AvatarModule,
    AvatarGroupModule,
    ButtonModule,
    Card,
    DatePipe,
    InterventionEditDrawer,
    InterventionMemberOption,
    InterventionTag,
    InterventionWorkItemDrawer,
    InterventionWorkItemTable,
    TooltipModule,
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
   * Property online
   * @readonly
   *
   * @description
   * Whether the workspace is currently connected. Deleting a planned work item
   * is a connected action (the offline outbox does not replay deletions), so it
   * gates the table's destructive affordances.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input<boolean>(true);

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

  /**
   * Property deleteWorkItems
   * @readonly
   *
   * @description
   * Emits the work items the user asked to delete (a single row, or the bulk
   * selection) so the parent page can confirm and perform the removal.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {OutputEmitterRef<readonly InterventionWorkItemOutput[]>}
   */
  public readonly deleteWorkItems: OutputEmitterRef<readonly InterventionWorkItemOutput[]> =
    output<readonly InterventionWorkItemOutput[]>();
  //#endregion

  //#region Properties
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
   * Property participantAvatarPt
   * @readonly
   *
   * @description
   * PrimeNG avatar pass-through aligning the stacked participant avatars with
   * the compact member-option avatar used by the Responsible row, so every
   * identity in the Properties rail shares one 20px footprint.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {AvatarPassThroughOptions}
   */
  protected readonly participantAvatarPt: AvatarPassThroughOptions = {
    root: {
      class:
        'size-5 text-[0.625rem] font-medium ring-2 ring-surface-0 bg-surface-100 text-surface-600 dark:ring-surface-950 dark:bg-surface-800 dark:text-surface-300',
    },
  };

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
   * Property visibleParticipants
   * @readonly
   *
   * @description
   * Participant members rendered as individual avatars, capped at
   * {@link PARTICIPANT_AVATAR_LIMIT}.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly visibleParticipants: Signal<readonly MemberSelectOption[]> = computed<
    readonly MemberSelectOption[]
  >(() => this.participantMembers().slice(0, PARTICIPANT_AVATAR_LIMIT));

  /**
   * Property participantOverflow
   * @readonly
   *
   * @description
   * Number of participants beyond {@link PARTICIPANT_AVATAR_LIMIT}, collapsed
   * into a single "+N" overflow avatar. Zero when all participants fit.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<number>}
   */
  protected readonly participantOverflow: Signal<number> = computed<number>(() =>
    Math.max(0, this.participantMembers().length - PARTICIPANT_AVATAR_LIMIT),
  );

  /**
   * Property participantOverflowNames
   * @readonly
   *
   * @description
   * Comma-separated names of the overflowed participants, surfaced as the
   * overflow avatar tooltip so hidden members stay discoverable.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly participantOverflowNames: Signal<string> = computed<string>(() =>
    this.participantMembers()
      .slice(PARTICIPANT_AVATAR_LIMIT)
      .map((member: MemberSelectOption): string => member.displayName)
      .join(', '),
  );

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

  /**
   * Property canAddWorkItem
   * @readonly
   *
   * @description
   * Whether a (planned) work item may be added from this panel: the user may
   * plan and the intervention is still a draft. Once preparation is confirmed
   * the backend only accepts discovered work items (added during execution),
   * so the add affordance is disabled here to prevent a guaranteed 409.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAddWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.intervention().status === 'draft',
  );

  /**
   * Property canDeleteWorkItem
   * @readonly
   *
   * @description
   * Whether prepared work items may be deleted: the user may add them and the
   * workspace is online. Deletion is not queued offline, so the destructive
   * affordances are hidden while disconnected to avoid a guaranteed failure.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDeleteWorkItem: Signal<boolean> = computed<boolean>(
    () => this.canAddWorkItem() && this.online(),
  );

  /**
   * Property planActionVisible
   * @readonly
   *
   * @description
   * Whether the "Plan intervention" action bar is shown: the user may plan and
   * the intervention is still a draft. Planning is only the next step from a
   * draft, so the bar (and its disabled-while-incomplete CTA) is suppressed for
   * read-only viewers and for non-draft prepare-phase statuses, avoiding a
   * permanently dead control pinned to the field viewport.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly planActionVisible: Signal<boolean> = computed<boolean>(
    () => this.canPlan() && this.intervention().status === 'draft',
  );
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

  //#endregion
}

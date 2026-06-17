import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  InterventionPlanningDetails,
  InterventionWorkItemOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components/intervention-tag';
import {
  InterventionPlanningForm,
  InterventionWorkItemForm,
  type InterventionPlanningFormValues,
  type InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { Card } from '@shared/components';

/**
 * Component InterventionPreparePanel
 * @class InterventionPreparePanel
 *
 * @description
 * Renders and orchestrates the intervention preparation phase.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-prepare-panel',
  imports: [
    ButtonModule,
    Card,
    DrawerModule,
    InterventionPlanningForm,
    InterventionTag,
    InterventionWorkItemForm,
    MessageModule,
    TagModule,
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
   * Intervention being prepared; used to seed planning form initial values.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> = input.required<InterventionOutput>();

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Planned work items listed in the scope panel.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input.required<readonly InterventionWorkItemOutput[]>();

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
   * Available site selector options forwarded to {@link InterventionPlanningForm}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input.required<readonly SelectOption[]>();

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Available member selector options forwarded to planning and work-item forms.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input.required<readonly MemberSelectOption[]>();

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
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input.required<readonly SelectOption[]>();
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
  //#endregion

  //#region Methods
  /**
   * Method savePlanningDetails
   * @method savePlanningDetails
   *
   * @description
   * Maps {@link InterventionPlanningForm} values to a planning-details payload
   * and emits them via the {@link saveDetails} output.
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
  }

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Maps {@link InterventionWorkItemForm} values to a work-item input payload,
   * emits it via the {@link createWorkItem} output, and closes the drawer.
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

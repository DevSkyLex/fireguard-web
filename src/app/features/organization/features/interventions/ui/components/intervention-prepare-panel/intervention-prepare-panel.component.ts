import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
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
import { toApiDateTime } from '@features/organization/features/interventions/utils';
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
  /** Input intervention. @readonly @access public @since 1.0.0 @type {InputSignal<InterventionOutput>} */
  public readonly intervention: InputSignal<InterventionOutput> = input.required();
  /** Input workItems. @readonly @access public @since 1.0.0 @type {InputSignal<readonly InterventionWorkItemOutput[]>} */
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input.required();
  /** Input saving. @readonly @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly saving: InputSignal<boolean> = input(false);
  /** Input canPlan. @readonly @access public @since 1.0.0 @type {InputSignal<boolean>} */
  public readonly canPlan: InputSignal<boolean> = input(false);
  /** Input siteOptions. @readonly @access public @since 1.0.0 @type {InputSignal<readonly SelectOption[]>} */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input.required();
  /** Input memberOptions. @readonly @access public @since 1.0.0 @type {InputSignal<readonly MemberSelectOption[]>} */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input.required();
  /** Input targetOptions. @readonly @access public @since 1.0.0 @type {InputSignal<readonly SelectOption[]>} */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input.required();

  /** Output planIntervention. @readonly @access public @since 1.0.0 @type {OutputEmitterRef<void>} */
  public readonly planIntervention: OutputEmitterRef<void> = output<void>();
  /** Output saveDetails. @readonly @access public @since 1.0.0 @type {OutputEmitterRef<InterventionPlanningDetails>} */
  public readonly saveDetails: OutputEmitterRef<InterventionPlanningDetails> =
    output<InterventionPlanningDetails>();
  /** Output createWorkItem. @readonly @access public @since 1.0.0 @type {OutputEmitterRef<CreateInterventionWorkItemInput>} */
  public readonly createWorkItem: OutputEmitterRef<CreateInterventionWorkItemInput> =
    output<CreateInterventionWorkItemInput>();

  /** Property workItemDrawerVisible. @readonly @access protected @since 1.0.0 @type {WritableSignal<boolean>} */
  protected readonly workItemDrawerVisible = signal(false);

  /**
   * Method savePlanningDetails
   * @method savePlanningDetails
   * @access protected
   * @since 1.0.0
   * @param {InterventionPlanningFormValues} values - Planning form values.
   * @returns {void}
   */
  protected savePlanningDetails(values: InterventionPlanningFormValues): void {
    this.saveDetails.emit({
      site: values.site,
      responsible: values.responsible,
      participants: values.participants,
      priority: values.priority,
      plannedStartAt: values.plannedStartAt ? toApiDateTime(values.plannedStartAt) : '',
      dueAt: values.dueAt ? toApiDateTime(values.dueAt) : '',
    });
  }

  /**
   * Method addWorkItem
   * @method addWorkItem
   * @access protected
   * @since 1.0.0
   * @param {InterventionWorkItemFormValues} values - Work item form values.
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
}

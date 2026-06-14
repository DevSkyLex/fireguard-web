import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  InterventionPlanningDetails,
  InterventionPriority,
  InterventionWorkItemAction,
  InterventionWorkItemOutput,
  SelectOption,
} from '@features/organization/features/interventions/models';

/**
 * Component InterventionPreparePanel
 * @class InterventionPreparePanel
 *
 * @description
 * Renders the intervention prepare workflow panel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-prepare-panel',
  imports: [
    ButtonModule,
    DrawerModule,
    FormsModule,
    MessageModule,
    MultiSelectModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './intervention-prepare-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPreparePanel {
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Provides the intervention value.
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
   * Provides the work items value.
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
   * Provides the saving value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input(false);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * Provides the site options value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly { label: string; value: string }[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> =
    input.required<readonly SelectOption[]>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Provides the member options value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly { label: string; value: string }[]>}
   */
  public readonly memberOptions: InputSignal<readonly SelectOption[]> =
    input.required<readonly SelectOption[]>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {string}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property targetOptions
   * @readonly
   *
   * @description
   * Provides the target options value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly { label: string; value: string }[]>}
   */
  public readonly targetOptions: InputSignal<readonly SelectOption[]> =
    input.required<readonly SelectOption[]>();

  /**
   * Property planIntervention
   * @readonly
   *
   * @description
   * Provides the plan intervention value.
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
   * Provides the save details value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {typeof saveDetails}
   */
  public readonly saveDetails: OutputEmitterRef<InterventionPlanningDetails> =
    output<InterventionPlanningDetails>();

  /**
   * Property createWorkItem
   * @readonly
   *
   * @description
   * Provides the create work item value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CreateInterventionWorkItemInput>}
   */
  public readonly createWorkItem: OutputEmitterRef<CreateInterventionWorkItemInput> =
    output<CreateInterventionWorkItemInput>();

  /**
   * Property workItemDrawerVisible
   * @readonly
   *
   * @description
   * Provides the work item drawer visible value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly workItemDrawerVisible: WritableSignal<boolean> = signal(false);

  /**
   * Property site
   * @readonly
   *
   * @description
   * Provides the site value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly site: WritableSignal<string> = linkedSignal(() => this.intervention().site ?? '');

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * Provides the responsible value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly responsible: WritableSignal<string> = linkedSignal(
    () => this.intervention().responsible ?? '',
  );

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Provides the participants value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  protected readonly participants: WritableSignal<readonly string[]> = linkedSignal<
    readonly string[]
  >(() => this.intervention().participants);

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Provides the priority value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionPriority>}
   */
  protected readonly priority: WritableSignal<InterventionPriority> = linkedSignal<InterventionPriority>(
    () => this.intervention().priority,
  );

  /**
   * Property plannedStartAt
   * @readonly
   *
   * @description
   * Provides the planned start at value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly plannedStartAt: WritableSignal<string> = linkedSignal(
    () => this.intervention().plannedStartAt?.slice(0, 16) ?? '',
  );

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Provides the due at value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly dueAt: WritableSignal<string> = linkedSignal(
    () => this.intervention().dueAt?.slice(0, 16) ?? '',
  );

  /**
   * Property workItemAction
   * @readonly
   *
   * @description
   * Provides the work item action value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionWorkItemAction>}
   */
  protected readonly workItemAction: WritableSignal<InterventionWorkItemAction> =
    signal<InterventionWorkItemAction>('inventory');

  /**
   * Property workItemTarget
   * @readonly
   *
   * @description
   * Provides the work item target value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly workItemTarget: WritableSignal<string> = signal('');

  /**
   * Property workItemAssignee
   * @readonly
   *
   * @description
   * Provides the work item assignee value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly workItemAssignee: WritableSignal<string> = signal('');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Provides the value value.
   *
   * @type {InterventionPriority}
   */

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */

  /**
   * Property priorityOptions
   * @readonly
   *
   * @description
   * Provides the priority options value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly { label: string; value: InterventionPriority }[]}
   */
  protected readonly priorityOptions: readonly { label: string; value: InterventionPriority }[] = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  /**
   * Method savePlanningDetails
   * @method savePlanningDetails
   *
   * @description
   * Executes the save planning details operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the save planning details operation.
   */
  protected savePlanningDetails(): void {
    const plannedStartAt = this.plannedStartAt();
    const dueAt = this.dueAt();
    this.saveDetails.emit({
      site: this.site(),
      responsible: this.responsible(),
      participants: this.participants(),
      priority: this.priority(),
      plannedStartAt: plannedStartAt ? new Date(plannedStartAt).toISOString() : '',
      dueAt: dueAt ? new Date(dueAt).toISOString() : '',
    });
  }

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Executes the add work item operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the add work item operation.
   */
  protected addWorkItem(): void {
    this.createWorkItem.emit({
      intervention: `/api/interventions/${this.intervention().id}`,
      action: this.workItemAction(),
      target: this.workItemTarget().trim() || null,
      assignee: this.workItemAssignee() || null,
      source: 'planned',
      required: true,
    });
    this.workItemDrawerVisible.set(false);
    this.workItemTarget.set('');
    this.workItemAssignee.set('');
  }
}

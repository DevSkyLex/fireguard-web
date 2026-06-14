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
  CreateMissionWorkItemInput,
  MissionOutput,
  MissionPlanningDetails,
  MissionPriority,
  MissionWorkItemAction,
  MissionWorkItemOutput,
  SelectOption,
} from '@features/organization/features/missions/models';

/**
 * Component MissionPreparePanel
 * @class MissionPreparePanel
 *
 * @description
 * Renders the mission prepare workflow panel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mission-prepare-panel',
  imports: [
    ButtonModule,
    DrawerModule,
    FormsModule,
    MessageModule,
    MultiSelectModule,
    SelectModule,
    TagModule,
  ],
  templateUrl: './mission-prepare-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionPreparePanel {
  /**
   * Property mission
   * @readonly
   *
   * @description
   * Provides the mission value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MissionOutput>}
   */
  public readonly mission: InputSignal<MissionOutput> = input.required<MissionOutput>();

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
   * @type {InputSignal<readonly MissionWorkItemOutput[]>}
   */
  public readonly workItems: InputSignal<readonly MissionWorkItemOutput[]> =
    input.required<readonly MissionWorkItemOutput[]>();

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
   * Property planMission
   * @readonly
   *
   * @description
   * Provides the plan mission value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly planMission: OutputEmitterRef<void> = output<void>();

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
  public readonly saveDetails: OutputEmitterRef<MissionPlanningDetails> =
    output<MissionPlanningDetails>();

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
   * @type {OutputEmitterRef<CreateMissionWorkItemInput>}
   */
  public readonly createWorkItem: OutputEmitterRef<CreateMissionWorkItemInput> =
    output<CreateMissionWorkItemInput>();

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
  protected readonly site: WritableSignal<string> = linkedSignal(() => this.mission().site ?? '');

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
    () => this.mission().responsible ?? '',
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
  >(() => this.mission().participants);

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
   * @type {WritableSignal<MissionPriority>}
   */
  protected readonly priority: WritableSignal<MissionPriority> = linkedSignal<MissionPriority>(
    () => this.mission().priority,
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
    () => this.mission().plannedStartAt?.slice(0, 16) ?? '',
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
    () => this.mission().dueAt?.slice(0, 16) ?? '',
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
   * @type {WritableSignal<MissionWorkItemAction>}
   */
  protected readonly workItemAction: WritableSignal<MissionWorkItemAction> =
    signal<MissionWorkItemAction>('inventory');

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
   * @type {MissionPriority}
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
   * @type {readonly { label: string; value: MissionPriority }[]}
   */
  protected readonly priorityOptions: readonly { label: string; value: MissionPriority }[] = [
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
      mission: `/api/missions/${this.mission().id}`,
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

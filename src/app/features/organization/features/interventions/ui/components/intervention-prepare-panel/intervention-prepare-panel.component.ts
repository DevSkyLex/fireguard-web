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
import { toApiDateTime } from '@features/organization/features/interventions/models';
import {
  InterventionPlanningForm,
  InterventionWorkItemForm,
  type InterventionPlanningFormValues,
  type InterventionWorkItemFormValues,
} from '@features/organization/features/interventions/ui/forms';

/** Renders and orchestrates the intervention preparation phase. */
@Component({
  selector: 'app-intervention-prepare-panel',
  imports: [
    ButtonModule,
    DrawerModule,
    InterventionPlanningForm,
    InterventionWorkItemForm,
    MessageModule,
    TagModule,
  ],
  templateUrl: './intervention-prepare-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPreparePanel {
  public readonly intervention: InputSignal<InterventionOutput> = input.required();
  public readonly workItems: InputSignal<readonly InterventionWorkItemOutput[]> = input.required();
  public readonly saving: InputSignal<boolean> = input(false);
  public readonly canPlan: InputSignal<boolean> = input(false);
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input.required();
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input.required();
  public readonly targetOptions: InputSignal<readonly SelectOption[]> = input.required();

  public readonly planIntervention: OutputEmitterRef<void> = output<void>();
  public readonly saveDetails: OutputEmitterRef<InterventionPlanningDetails> =
    output<InterventionPlanningDetails>();
  public readonly createWorkItem: OutputEmitterRef<CreateInterventionWorkItemInput> =
    output<CreateInterventionWorkItemInput>();

  protected readonly workItemDrawerVisible = signal(false);

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

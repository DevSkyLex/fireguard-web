import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import { toApiDateTime } from '@features/organization/features/interventions/models';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '@features/organization/features/interventions/state/intervention-planning-options';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '@features/organization/features/interventions/ui/forms';
import { ActiveOrganizationStore } from '@features/organization/state';

/** Orchestrates creation of an intervention draft. */
@Component({
  selector: 'app-intervention-create-page',
  imports: [InterventionCreateForm],
  providers: [InterventionPlanningOptionsStore],
  templateUrl: './intervention-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreatePage {
  protected readonly planningOptions: InterventionPlanningOptionsStoreType = inject(
    InterventionPlanningOptionsStore,
  );
  protected readonly creating = signal(false);

  private readonly organization = inject(ActiveOrganizationStore);
  private readonly interventions = inject(InterventionService);
  private readonly router = inject(Router);

  public constructor() {
    effect(() => {
      this.planningOptions.loadCreationOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
  }

  protected create(values: InterventionCreateFormValues): void {
    const organizationId = this.organization.selectedOrganization()?.id;
    if (!organizationId) return;

    this.creating.set(true);
    this.interventions
      .create(organizationId, values.name.trim(), {
        type: values.type,
        priority: values.priority,
        participants: values.participants,
        ...(values.site ? { site: values.site } : {}),
        ...(values.responsible ? { responsible: values.responsible } : {}),
        ...(values.plannedStartAt ? { plannedStartAt: toApiDateTime(values.plannedStartAt) } : {}),
        ...(values.dueAt ? { dueAt: toApiDateTime(values.dueAt) } : {}),
        ...(values.referencePack ? { referencePack: values.referencePack } : {}),
      })
      .subscribe({
        next: (intervention) =>
          void this.router.navigate([
            '/organizations',
            organizationId,
            'interventions',
            intervention.id,
          ]),
        error: () => this.creating.set(false),
      });
  }
}

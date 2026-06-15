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

/**
 * Component InterventionCreatePage
 * @class InterventionCreatePage
 *
 * @description
 * Orchestrates creation of an intervention draft.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-page',
  imports: [InterventionCreateForm],
  providers: [InterventionPlanningOptionsStore],
  templateUrl: './intervention-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreatePage {
  /** Property planningOptions. @readonly @description Provides creation selector options. @access protected @since 1.0.0 @type {InterventionPlanningOptionsStoreType} */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType = inject(
    InterventionPlanningOptionsStore,
  );
  /** Property creating. @readonly @description Indicates whether creation is running. @access protected @since 1.0.0 @type {WritableSignal<boolean>} */
  protected readonly creating = signal(false);

  /** Property organization. @readonly @description Provides the active organization. @access private @since 1.0.0 @type {ActiveOrganizationStore} */
  private readonly organization = inject(ActiveOrganizationStore);
  /** Property interventions. @readonly @description Provides intervention API operations. @access private @since 1.0.0 @type {InterventionService} */
  private readonly interventions = inject(InterventionService);
  /** Property router. @readonly @description Provides application navigation. @access private @since 1.0.0 @type {Router} */
  private readonly router = inject(Router);

  /** @constructor @description Loads creation options for the active organization. */
  public constructor() {
    effect(() => {
      this.planningOptions.loadCreationOptions(
        this.organization.selectedOrganization()?.id ?? null,
      );
    });
  }

  /** Method create. @method create @description Creates an intervention draft and opens it. @access protected @since 1.0.0 @param {InterventionCreateFormValues} values - Validated draft values. @returns {void} */
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

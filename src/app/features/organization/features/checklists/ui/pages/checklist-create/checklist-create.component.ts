import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import {
  ChecklistForm,
  type ChecklistFormValues,
} from '@features/organization/features/checklists/ui/forms';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Page coordinating checklist creation for the active organization.
 */
@Component({
  selector: 'app-checklist-create',
  imports: [ChecklistForm],
  providers: [ChecklistStore],
  templateUrl: './checklist-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistCreatePage {
  /** Router used after checklist creation or cancellation. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative checklist routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  /** Page-scoped checklist workflow store. */
  protected readonly store: ChecklistStore = inject<ChecklistStore>(ChecklistStore);

  /** Observes creation success and returns to the checklist list. */
  public constructor() {
    effect(() => {
      if (this.store.createCallState().status === 'success') {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /** Creates a checklist for the active organization. */
  protected submit(values: ChecklistFormValues): void {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;
    const input: CreateChecklistInput = {
      name: values.name,
      version: values.version,
      items: values.items.map((item, index) => ({
        label: item.label,
        description: item.description || null,
        required: item.required,
        position: index + 1,
      })),
    };
    this.store.create({ organizationId, input });
  }

  /** Returns to the checklist list without creating. */
  protected cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}

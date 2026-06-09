import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { UpsertOrganizationLegalProfileInput } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationLegalProfileStore,
} from '@features/organization/state';
import { OrganizationLegalProfileForm } from '@features/organization/ui/forms';

/**
 * Page coordinating the active organization's legal profile.
 */
@Component({
  selector: 'app-organization-legal-profile',
  imports: [ButtonModule, MessageModule, OrganizationLegalProfileForm],
  providers: [OrganizationLegalProfileStore],
  templateUrl: './organization-legal-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLegalProfilePage {
  /** PrimeNG message service used for save feedback. */
  private readonly messageService: MessageService = inject(MessageService);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Page-scoped legal profile workflow store. */
  protected readonly store: OrganizationLegalProfileStore = inject(OrganizationLegalProfileStore);

  /** Loads the active organization legal profile. */
  public constructor() {
    this.reload();
    effect(() => {
      if (this.store.saveCallState().status === 'success') {
        this.messageService.add({
          severity: 'success',
          summary: 'Legal profile saved',
          detail: 'The organization legal information has been updated.',
        });
      }
    });
  }

  /** Saves the active organization legal profile. */
  protected save(input: UpsertOrganizationLegalProfileInput): void {
    const organizationId = this.organizationId();
    if (organizationId) this.store.save({ organizationId, input });
  }

  /** Reloads the active organization legal profile. */
  protected reload(): void {
    const organizationId = this.organizationId();
    if (organizationId) this.store.load(organizationId);
  }

  /** Returns the active organization identifier when available. */
  private organizationId(): string | undefined {
    return this.activeOrganizationStore.selectedOrganization()?.id;
  }
}

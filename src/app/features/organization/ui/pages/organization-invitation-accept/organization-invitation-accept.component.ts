import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { OrganizationInvitationAcceptStore } from '@features/organization/state';

/**
 * Public page coordinating organization invitation acceptance.
 */
@Component({
  selector: 'app-organization-invitation-accept',
  imports: [ButtonModule, CardModule, MessageModule],
  providers: [OrganizationInvitationAcceptStore],
  templateUrl: './organization-invitation-accept.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationAcceptPage {
  /** Active route containing the invitation token query parameter. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Router used after invitation processing. */
  private readonly router: Router = inject<Router>(Router);
  /** Page-scoped invitation acceptance store. */
  protected readonly store: OrganizationInvitationAcceptStore = inject(
    OrganizationInvitationAcceptStore,
  );
  /** Invitation token extracted from the current URL. */
  protected readonly token: string = this.route.snapshot.queryParamMap.get('token') ?? '';

  /** Accepts the current invitation token when present. */
  protected accept(): void {
    if (this.token) this.store.accept(this.token);
  }

  /** Navigates to the organization list. */
  protected goToOrganizations(): void {
    this.router.navigate(['/organizations']);
  }
}

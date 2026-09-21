import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { AutomationAttemptOutput } from '@features/organization/features/automations/models';
import {
  AutomationExecutionsStore,
  type AutomationExecutionsStoreType,
} from '@features/organization/features/automations/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component AutomationsPage
 * @class AutomationsPage
 * @description Shows the effective rule and server-counted execution history with explicit recovery actions.
 * @version 1.0.0
 */
@Component({
  selector: 'app-automations-page',
  imports: [DatePipe, RouterLink, HlmButton, HlmBadge, HlmSkeleton, ...HlmEmptyImports],
  providers: [AutomationExecutionsStore],
  templateUrl: './automations-page.component.html',
  host: { class: 'block w-full min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationsPage {
  /**
   * Property store
   * @readonly
   * @description Page-owned execution state.
   * @access protected
   * @since 1.0.0
   * @type {AutomationExecutionsStoreType}
   */
  protected readonly store: AutomationExecutionsStoreType = inject(AutomationExecutionsStore);
  /**
   * Property context
   * @readonly
   * @description Owning workspace context.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  protected readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
  /**
   * Property permissions
   * @readonly
   * @description Access to the existing policy editor and created interventions.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationPermissionService}
   */
  protected readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property permission
   * @readonly
   * @description Named permission catalog.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_PERMISSION}
   */
  protected readonly permission: typeof ORGANIZATION_PERMISSION = ORGANIZATION_PERMISSION;
  /**
   * Property ready
   * @readonly
   * @description Defers secondary history until hydration.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly ready: WritableSignal<boolean> = signal(false);
  /**
   * Constructor
   * @constructor
   * @description Loads and clears history with browser workspace changes.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      const organizationId = this.context.selectedOrganizationId();
      const ready = this.ready();
      untracked(() => this.store.load({ organizationId: ready ? organizationId : null, page: 1 }));
    });
  }
  /**
   * Method load
   * @description Reads the requested page or refreshes current progress.
   * @access protected
   * @since 1.0.0
   * @param {number} page - One-based history page.
   * @returns {void}
   */
  protected load(page: number): void {
    this.store.refresh(page);
  }
  /**
   * Method statusLabel
   * @description Localized persisted execution state.
   * @access protected
   * @since 1.0.0
   * @param {AutomationAttemptOutput['status']} status - Server state.
   * @returns {string} Visible state label.
   */
  protected statusLabel(status: AutomationAttemptOutput['status']): string {
    switch (status) {
      case 'pending':
        return $localize`:@@automation.pending:Queued`;
      case 'running':
        return $localize`:@@automation.running:Running`;
      case 'failed':
        return $localize`:@@automation.failed:Failed`;
      case 'succeeded':
        return $localize`:@@automation.succeeded:Completed`;
      case 'skipped':
        return $localize`:@@automation.skipped:Skipped`;
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignalWithTransform,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';
import { AuditStore } from '@features/organization/state/organization-audit';
import { AuditEventDetailDrawer } from '@features/organization/ui/drawers';
import { AuditEventTable } from '@features/organization/ui/tables';

/**
 * Page OrganizationAuditLogPage
 * @class OrganizationAuditLogPage
 *
 * @description
 * Route entry page for the audit log. Owns the page-scoped `AuditStore`,
 * forwards the {@link AuditEventTable} lazy-load requests to it, keeps the
 * `?page=` query param in sync, and orchestrates the read-only
 * {@link AuditEventDetailDrawer}. Access is gated by the global `audit.read`
 * permission (see `organization.routes.ts`), not by organization-member RBAC.
 *
 * The underlying `/api/audit-events` endpoint is a **platform-wide** ledger
 * with no `organizationId` filter — it is not scoped to the active
 * organization even though the route is mounted under
 * `/organizations/:organizationId/audit`. The page copy makes this explicit.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-audit-log',
  imports: [ButtonModule, MessageModule, AuditEventTable, AuditEventDetailDrawer],
  providers: [AuditStore],
  templateUrl: './organization-audit-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAuditLogPage {
  //#region Inputs
  /**
   * Current page number bound from the `?page=` query param via
   * `withComponentInputBinding`. Passed down to the table as `initialPage`.
   */
  public readonly page: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)),
  });
  //#endregion

  //#region Properties
  /** Angular Router used to keep the `?page=` query param in sync. */
  private readonly router: Router = inject<Router>(Router);

  /** Current activated route, used to update `?page=` while preserving other query params. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /** Page-scoped audit log store. */
  protected readonly store: AuditStore = inject<AuditStore>(AuditStore);

  /** Localized fallback for the load-error banner. */
  protected readonly loadErrorFallback: string = $localize`:@@audit.page.loadError:The audit log could not be loaded.`;

  /** Last filter and pagination options sent to the store, replayed by "Retry". */
  private lastOptions: AuditEventListOptions | undefined;

  /** Audit event currently shown in the detail drawer, or `null` when closed. */
  protected readonly selectedEvent: WritableSignal<AuditEventOutput | null> =
    signal<AuditEventOutput | null>(null);
  //#endregion

  //#region Methods
  /** Forwards the table's lazy-load request to the store. */
  protected onLoad(options: AuditEventListOptions): void {
    this.lastOptions = options;
    this.store.load(options);
  }

  /** Replays the last load request after a failure. */
  protected retry(): void {
    this.store.load(this.lastOptions);
  }

  /** Updates the `?page=` query param, omitting page 1 to keep the URL clean. */
  protected onPageChange(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /** Opens the detail drawer for the selected audit event. */
  protected onViewDetails(auditEvent: AuditEventOutput): void {
    this.selectedEvent.set(auditEvent);
  }

  /** Reflects the drawer's own dismiss/close interactions. */
  protected onDrawerVisibleChange(visible: boolean): void {
    if (!visible) {
      this.selectedEvent.set(null);
    }
  }
  //#endregion
}

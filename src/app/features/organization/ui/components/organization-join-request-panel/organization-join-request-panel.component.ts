import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUserRoundPlus } from '@ng-icons/lucide';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { OrganizationJoinRequestReviewDialog } from '@features/organization/ui/dialogs/organization-join-request-review-dialog';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
/**
 * Component OrganizationJoinRequestPanel
 * @class OrganizationJoinRequestPanel
 * @description Renders request lifecycle and the server-authorized review actions. Owns only dialog selection; the page orchestrates data and decisions.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-join-request-panel',
  imports: [
    DatePipe,
    NgIcon,
    OrganizationJoinRequestReviewDialog,
    HlmAlertImports,
    HlmItemImports,
    HlmBadge,
    HlmButton,
    HlmEmptyImports,
    HlmSkeleton,
  ],
  providers: [provideIcons({ lucideUserRoundPlus })],
  templateUrl: './organization-join-request-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationJoinRequestPanel {
  /**
   * Property requests
   * @readonly
   * @description Visible organization membership requests.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<OrganizationJoinRequestOutput>>}
   */
  public readonly requests: InputSignal<ReadonlyArray<OrganizationJoinRequestOutput>> = input<
    ReadonlyArray<OrganizationJoinRequestOutput>
  >([]);
  /**
   * Property roles
   * @readonly
   * @description Role catalog authorized for this reviewer.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{id:string;label:string}>>}
   */
  public readonly roles: InputSignal<ReadonlyArray<{ id: string; label: string }>> = input<
    ReadonlyArray<{ id: string; label: string }>
  >([]);
  /**
   * Property loading
   * @readonly
   * @description Request collection load state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
  /**
   * Property pending
   * @readonly
   * @description Decision in progress.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   * @description Recoverable list or decision error.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property retried
   * @readonly
   * @description Refresh or retry request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output();
  /**
   * Property approved
   * @readonly
   * @description Confirmed role-bearing approval.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<{requestId:string;roleIds:string[]}>}
   */
  public readonly approved: OutputEmitterRef<{ requestId: string; roleIds: string[] }> = output();
  /**
   * Property rejected
   * @readonly
   * @description Confirmed refusal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly rejected: OutputEmitterRef<string> = output();
  /**
   * Property selectedId
   * @readonly
   * @description Request currently under review.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedId: WritableSignal<string | null> = signal(null);
  /**
   * Property selected
   * @readonly
   * @description Closes a completed request after its server actions disappear.
   * @access protected
   * @since 1.0.0
   * @type {Signal<OrganizationJoinRequestOutput | null>}
   */
  protected readonly selected: Signal<OrganizationJoinRequestOutput | null> = computed(
    () =>
      this.requests().find(
        (request) =>
          request.id === this.selectedId() &&
          (request.actions.includes('approve') || request.actions.includes('reject')),
      ) ?? null,
  );
  /**
   * Property statusLabels
   * @readonly
   * @description Localized lifecycle labels.
   * @access protected
   * @since 1.0.0
   * @type {Readonly<Record<OrganizationJoinRequestOutput['status'], string>>}
   */
  protected readonly statusLabels: Readonly<
    Record<OrganizationJoinRequestOutput['status'], string>
  > = {
    pending: $localize`:@@org.access.requests.pending:Awaiting review`,
    approved: $localize`:@@org.access.requests.approved:Approved`,
    rejected: $localize`:@@org.access.requests.rejected:Rejected`,
    cancelled: $localize`:@@org.access.requests.cancelled:Cancelled`,
    expired: $localize`:@@org.access.requests.expired:Expired`,
  };
}

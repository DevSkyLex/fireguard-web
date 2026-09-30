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
import {
  lucideBan,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleX,
  lucideClock,
} from '@ng-icons/lucide';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { OrganizationJoinRequestReviewDialog } from '@features/organization/ui/dialogs/organization-join-request-review-dialog';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmMuted } from '@shared/ui/typography';

/**
 * Interface OrganizationJoinRequestStatusDescriptor
 * @interface OrganizationJoinRequestStatusDescriptor
 *
 * @description
 * How one request status looks, wherever it appears: a localized label, an
 * icon, and the icon's severity class — a status is never colour alone.
 *
 * @since 1.1.0
 */
interface OrganizationJoinRequestStatusDescriptor {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Names the request status in text alongside its icon.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Identifies the status icon without making color the only status cue.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property iconClass
   * @readonly
   *
   * @description
   * Supplies the severity styling associated with this request status.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly iconClass: string;
}

/**
 * Component OrganizationJoinRequestPanel
 * @class OrganizationJoinRequestPanel
 *
 * @description
 * Renders request lifecycle and the server-authorized review actions. Owns only dialog selection;
 * the page orchestrates data and decisions.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-join-request-panel',
  imports: [
    NgIcon,
    OrgDatePipe,
    OrganizationJoinRequestReviewDialog,
    HlmAlertImports,
    HlmItemImports,
    HlmBadge,
    HlmButton,
    HlmEmptyImports,
    HlmMuted,
    HlmSkeleton,
    ResourceIllustration,
  ],
  providers: [
    provideIcons({
      lucideBan,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCircleX,
      lucideClock,
    }),
  ],
  templateUrl: './organization-join-request-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationJoinRequestPanel {
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone. The default keeps the component renderable
   * with no context wired.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

  /**
   * Property requests
   * @readonly
   *
   * @description
   * Visible organization membership requests.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<OrganizationJoinRequestOutput>>}
   */
  public readonly requests: InputSignal<ReadonlyArray<OrganizationJoinRequestOutput>> = input<
    ReadonlyArray<OrganizationJoinRequestOutput>
  >([]);

  /**
   * Property roles
   * @readonly
   *
   * @description
   * Role catalog authorized for this reviewer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<{ id: string; label: string }>>}
   */
  public readonly roles: InputSignal<ReadonlyArray<{ id: string; label: string }>> = input<
    ReadonlyArray<{ id: string; label: string }>
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Request collection load state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Decision in progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable list or decision error.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Refresh or retry request.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output();

  /**
   * Property approved
   * @readonly
   *
   * @description
   * Confirmed role-bearing approval.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{ requestId: string; roleIds: string[] }>}
   */
  public readonly approved: OutputEmitterRef<{ requestId: string; roleIds: string[] }> = output();

  /**
   * Property rejected
   * @readonly
   *
   * @description
   * Confirmed refusal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly rejected: OutputEmitterRef<string> = output();

  /**
   * Property selectedId
   * @readonly
   *
   * @description
   * Request currently under review.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedId: WritableSignal<string | null> = signal(null);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Closes a completed request after its server actions disappear.
   *
   * @access protected
   * @since 1.0.0
   *
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
   * Property statusDescriptors
   * @readonly
   *
   * @description
   * Every status's localized label, icon and severity class — pairing colour with a label and glyph
   * so a request's lifecycle is never conveyed by colour alone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Readonly<Record<OrganizationJoinRequestOutput['status'], OrganizationJoinRequestStatusDescriptor>>}
   */
  protected readonly statusDescriptors: Readonly<
    Record<OrganizationJoinRequestOutput['status'], OrganizationJoinRequestStatusDescriptor>
  > = {
    pending: {
      label: $localize`:@@org.access.requests.pending:Awaiting review`,
      icon: 'lucideClock',
      iconClass: 'text-muted-foreground',
    },
    approved: {
      label: $localize`:@@org.access.requests.approved:Approved`,
      icon: 'lucideCircleCheck',
      iconClass: 'text-success',
    },
    rejected: {
      label: $localize`:@@org.access.requests.rejected:Rejected`,
      icon: 'lucideCircleX',
      iconClass: 'text-destructive',
    },
    cancelled: {
      label: $localize`:@@org.access.requests.cancelled:Cancelled`,
      icon: 'lucideBan',
      iconClass: 'text-muted-foreground',
    },
    expired: {
      label: $localize`:@@org.access.requests.expired:Expired`,
      icon: 'lucideCircleAlert',
      iconClass: 'text-warning',
    },
  };
}

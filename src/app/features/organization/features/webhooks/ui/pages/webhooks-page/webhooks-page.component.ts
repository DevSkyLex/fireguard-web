import { Clipboard } from '@angular/cdk/clipboard';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCirclePause,
  lucideEllipsis,
  lucideKeyRound,
  lucidePlus,
  lucideRefreshCw,
  lucideTrash2,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  WebhookSubscriptionOutput,
  WebhookSubscriptionInput,
  WebhookMutation,
  WebhookDeliveryOutput,
} from '@features/organization/features/webhooks/models';
import {
  WebhookSubscriptionsStore,
  webhookSubscriptionsEvents,
  type WebhookSubscriptionsStoreType,
} from '@features/organization/features/webhooks/state';
import { WebhookSubscriptionForm } from '@features/organization/features/webhooks/ui/forms/webhook-subscription-form';
import { resolveWebhookEventLabel } from '@features/organization/features/webhooks/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { CollectionPagination } from '@shared/collection-pagination';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { sheetSide } from '@shared/sheet-side';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { WebhookDeliveryStatusTag } from '../../components/webhook-delivery-status-tag';

/** The subscription and delivery pages' fixed, server-set page size — the store computes both page counts against it. */
const PAGE_SIZE: number = 20;

/**
 * Component WebhooksPage
 * @class WebhooksPage
 *
 * @description
 * Coordinates browser-only endpoint management and durable delivery
 * history. "Refresh" and "Add webhook" register on the shell header through
 * `PageActionsService`, matching `OrganizationTeamsPage`. The subscription
 * picker and delivery list render as flat `hlmItemGroup`s, paged with
 * `app-collection-pagination`; the delivery status filter is an
 * `hlm-toggle-group`; every load and mutation failure renders as an
 * `hlmAlert`. Rotate secret and Delete sit behind an `hlm-dropdown-menu`,
 * Delete drawn `variant="destructive"`. Secrets remain in local dialog state
 * and are cleared on scope change or dismissal.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-webhooks-page',
  imports: [
    NgIcon,
    OrgDatePipe,
    HlmButton,
    HlmBadge,
    HlmSkeleton,
    HlmInput,
    WebhookSubscriptionForm,
    WebhookDeliveryStatusTag,
    CollectionPagination,
    UnsavedChangesDialog,
    ResourceIllustration,
    StateIllustration,
    ...HlmAlertImports,
    ...HlmAlertDialogImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
    ...HlmSheetImports,
    ...HlmToggleGroupImports,
    ...HlmTooltipImports,
  ],
  providers: [
    WebhookSubscriptionsStore,
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCirclePause,
      lucideEllipsis,
      lucideKeyRound,
      lucidePlus,
      lucideRefreshCw,
      lucideTrash2,
    }),
  ],
  templateUrl: './webhooks-page.component.html',
  host: { class: 'block w-full min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebhooksPage {
  /**
   * Property store
   * @readonly
   * @description Route-owned request and entity state.
   * @access protected
   * @since 1.0.0
   * @type {WebhookSubscriptionsStoreType}
   */
  protected readonly store: WebhookSubscriptionsStoreType = inject(WebhookSubscriptionsStore);
  /**
   * Property context
   * @readonly
   * @description Canonical selected organization.
   * @access private
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  private readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
  /**
   * Property permissions
   * @readonly
   * @description Published organization permission helper.
   * @access private
   * @since 1.0.0
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property clipboard
   * @readonly
   * @description User-initiated secret copy only.
   * @access private
   * @since 1.0.0
   * @type {Clipboard}
   */
  private readonly clipboard: Clipboard = inject(Clipboard);
  /**
   * Property pageActionsService
   * @readonly
   * @description Registers {@link pageActions} on the shell header.
   * @access private
   * @since 1.1.0
   * @type {PageActionsService}
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);
  /**
   * Property pageActions
   * @readonly
   * @description The page's own `#pageActions` template — "Refresh" and, when {@link canManage}, "Add webhook".
   * @access protected
   * @since 1.1.0
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  protected readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  /**
   * Property ready
   * @readonly
   * @description Prevents private reads during SSR.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly ready: WritableSignal<boolean> = signal(false);
  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings.
   * @access protected
   * @since 1.1.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT).regionalFormatting;
  /**
   * Property pageSizes
   * @readonly
   * @description The single, fixed page size {@link PAGE_SIZE} the subscription and delivery pagers offer — hides `app-collection-pagination`'s rows-per-page selector.
   * @access protected
   * @since 1.1.0
   * @type {readonly [number]}
   */
  protected readonly pageSizes: readonly [number] = [PAGE_SIZE];
  /**
   * Property canManage
   * @readonly
   * @description Management controls follow current grants.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.WEBHOOKS_MANAGE),
  );
  /**
   * Property editorOpen
   * @readonly
   * @description Editor visibility.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly editorOpen: WritableSignal<boolean> = signal(false);
  /**
   * Property editing
   * @readonly
   * @description Snapshot retained during a failed save.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<WebhookSubscriptionOutput | null>}
   */
  protected readonly editing: WritableSignal<WebhookSubscriptionOutput | null> =
    signal<WebhookSubscriptionOutput | null>(null);
  /**
   * Property dirty
   * @readonly
   * @description Editor draft protection.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);
  /**
   * Property discardState
   * @readonly
   * @description Explicit discard confirmation.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly discardState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');
  /**
   * Property confirmation
   * @readonly
   * @description An explicit rotation, delete or redelivery intent.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<WebhookMutation | null>}
   */
  protected readonly confirmation: WritableSignal<WebhookMutation | null> =
    signal<WebhookMutation | null>(null);
  /**
   * Property secret
   * @readonly
   * @description One-time secret, never serialized or persisted.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly secret: WritableSignal<string | null> = signal<string | null>(null);
  /**
   * Property copied
   * @readonly
   * @description Copy acknowledgement.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly copied: WritableSignal<boolean> = signal(false);
  /**
   * Property notice
   * @readonly
   * @description Accepted queue acknowledgement.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly notice: WritableSignal<string | null> = signal<string | null>(null);
  /**
   * Property side
   * @readonly
   * @description Uses shared interaction mode.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
  /**
   * Property sheet
   * @readonly
   * @description Native sheet control for discard protection.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmSheet | undefined>}
   */
  private readonly sheet: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  /**
   * Property filters
   * @readonly
   * @description Short, comparable delivery filters.
   * @access protected
   * @since 1.0.0
   * @type {ReadonlyArray<{ value: WebhookDeliveryOutput['status'] | ''; label: string }>}
   */
  protected readonly filters: ReadonlyArray<{
    value: WebhookDeliveryOutput['status'] | '';
    label: string;
  }> = [
    { value: '', label: $localize`:@@webhooks.all:All` },
    { value: 'pending', label: $localize`:@@webhooks.pending:Pending` },
    { value: 'delivered', label: $localize`:@@webhooks.delivered:Delivered` },
    { value: 'failed', label: $localize`:@@webhooks.failed:Failed` },
  ];
  /**
   * Property refreshLabel
   * @readonly
   * @description The "Refresh" icon button's accessible name, shared by its `aria-label` and `hlmTooltip`.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly refreshLabel: string = $localize`:@@common.refresh:Refresh`;
  /**
   * Property rowMenuLabel
   * @readonly
   * @description The per-subscription "more actions" trigger's accessible name.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly rowMenuLabel: string = $localize`:@@webhooks.rowMenu:More actions`;
  /**
   * Property confirmationTitle
   * @readonly
   * @description Consequence-specific confirmation title.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmationTitle: Signal<string> = computed(() => {
    if (this.confirmation()?.kind === 'delete')
      return $localize`:@@webhooks.deleteTitle:Delete this webhook?`;
    if (this.confirmation()?.kind === 'rotate')
      return $localize`:@@webhooks.rotateTitle:Replace the signing secret?`;
    return $localize`:@@webhooks.redeliverTitle:Send this delivery again?`;
  });
  /**
   * Property confirmationDescription
   * @readonly
   * @description Describes the consequence before the command.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmationDescription: Signal<string> = computed(() => {
    if (this.confirmation()?.kind === 'delete')
      return $localize`:@@webhooks.deleteHint:The subscription and its delivery history will be permanently deleted.`;
    if (this.confirmation()?.kind === 'rotate')
      return $localize`:@@webhooks.rotateHint:The current secret will stop working immediately. Update your receiver with the new secret after confirming.`;
    return $localize`:@@webhooks.redeliverHint:The same delivery will be sent again. Its identifier stays the same so your receiver can prevent duplicate processing.`;
  });
  /**
   * Constructor
   * @constructor
   * @description Starts scoped reads only after rendering, consumes transient command results, and registers {@link pageActions}.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      const organizationId = this.context.selectedOrganizationId();
      const ready = this.ready();
      untracked(() => {
        this.editorOpen.set(false);
        this.editing.set(null);
        this.confirmation.set(null);
        this.secret.set(null);
        this.copied.set(false);
        this.notice.set(null);
        this.dirty.set(false);
        this.discardState.set('closed');
        this.store.load({ organizationId: ready ? organizationId : null, page: 1 });
      });
    });
    effect(() => {
      if (this.canManage()) return;
      untracked(() => {
        this.editorOpen.set(false);
        this.confirmation.set(null);
        this.secret.set(null);
      });
    });
    inject(Events)
      .on(webhookSubscriptionsEvents.completed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.context.selectedOrganizationId()) return;
        this.editorOpen.set(false);
        this.editing.set(null);
        this.confirmation.set(null);
        this.dirty.set(false);
        if (payload.secret && this.canManage()) {
          this.copied.set(false);
          this.secret.set(payload.secret);
        }
        this.notice.set(
          payload.kind === 'ping' || payload.kind === 'redeliver'
            ? $localize`:@@webhooks.queued:The delivery is queued. Refresh its history to check the result.`
            : null,
        );
      });
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));
  }
  /**
   * Method openEditor
   * @method openEditor
   * @description Opens a snapshot editor and requests the catalog.
   * @access protected
   * @since 1.0.0
   * @param {WebhookSubscriptionOutput | null} subscription - Existing endpoint or a new draft.
   * @returns {void}
   */
  protected openEditor(subscription: WebhookSubscriptionOutput | null): void {
    if (!this.canManage() || this.store.isMutating()) return;
    this.store.clearMutationFeedback();
    this.editing.set(subscription);
    this.dirty.set(false);
    this.editorOpen.set(true);
    this.store.loadCatalog();
  }
  /**
   * Method save
   * @method save
   * @description Dispatches only the form changes.
   * @access protected
   * @since 1.0.0
   * @param {Partial<WebhookSubscriptionInput>} input - Changed form fields.
   * @returns {void}
   */
  protected save(input: Partial<WebhookSubscriptionInput>): void {
    const current = this.editing();
    if (current) {
      if (Object.keys(input).length === 0) {
        this.editorOpen.set(false);
        return;
      }
      this.store.mutate({ kind: 'update', id: current.id, input });
    } else if (input.url && input.eventTypes) {
      this.store.mutate({
        kind: 'create',
        input: {
          url: input.url,
          description: input.description ?? '',
          eventTypes: input.eventTypes,
        },
      });
    }
  }
  /**
   * Method closeEditor
   * @method closeEditor
   * @description Preserves dirty data until discard is confirmed.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected closeEditor(): void {
    if (this.store.isMutating()) return;
    if (this.dirty()) {
      this.sheet()?.open();
      this.discardState.set('open');
      return;
    }
    this.editorOpen.set(false);
    this.editing.set(null);
  }
  /**
   * Method discard
   * @method discard
   * @description Closes the editor after explicit discard.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected discard(): void {
    this.discardState.set('closed');
    this.dirty.set(false);
    this.editorOpen.set(false);
    this.editing.set(null);
  }
  /**
   * Method request
   * @method request
   * @description Prepares a consequence-specific management confirmation.
   * @access protected
   * @since 1.0.0
   * @param {WebhookMutation} action - Requested management action.
   * @returns {void}
   */
  protected request(action: WebhookMutation): void {
    if (!this.canManage() || this.store.isMutating()) return;
    this.store.clearMutationFeedback();
    this.confirmation.set(action);
  }
  /**
   * Method confirm
   * @method confirm
   * @description Executes the explicitly confirmed command once.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    const action = this.confirmation();
    if (action) this.store.mutate(action);
  }
  /**
   * Method refresh
   * @method refresh
   * @description Checks the server without repeating a management command.
   * @access protected
   * @since 1.0.0
   * @param {number} page - Subscription page to read.
   * @returns {void}
   */
  protected refresh(page: number): void {
    if (this.store.isMutating()) return;
    this.store.clearMutationFeedback();
    this.notice.set(null);
    this.store.load({ organizationId: this.context.selectedOrganizationId(), page });
  }
  /**
   * Method copySecret
   * @method copySecret
   * @description Copies only on explicit user interaction.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected copySecret(): void {
    const secret = this.secret();
    if (secret) this.copied.set(this.clipboard.copy(secret));
  }
  /**
   * Method onStatusFilterChanged
   * @description Narrows `hlm-toggle-group`'s single-select payload to one of {@link filters}' values, defaulting to `''` (all) for anything else.
   * @access protected
   * @since 1.1.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   * @returns {void}
   */
  protected onStatusFilterChanged(value: string | readonly string[] | null | undefined): void {
    const status: WebhookDeliveryOutput['status'] | '' =
      typeof value === 'string' && this.filters.some((filter) => filter.value === value)
        ? (value as WebhookDeliveryOutput['status'] | '')
        : '';

    this.store.loadDeliveries(1, status);
  }
  /**
   * Method eventLabelOf
   * @description The curated localized label for a raw event type key, falling back to the loaded catalog's own label, then to the key.
   * @access protected
   * @since 1.1.0
   * @param {string} value - Raw event type key.
   * @returns {string} The resolved label.
   */
  protected eventLabelOf(value: string): string {
    return resolveWebhookEventLabel(
      value,
      this.store.events().find((event) => event.value === value)?.label,
    );
  }
  /**
   * Method failureLabel
   * @method failureLabel
   * @description Consumes stable codes without exposing transport diagnostics.
   * @access protected
   * @since 1.0.0
   * @param {string} code - Public API failure code.
   * @returns {string} Localized actionable reason.
   */
  protected failureLabel(code: string): string {
    switch (code) {
      case 'webhook_timeout':
        return $localize`:@@webhooks.timeout:The destination did not respond in time.`;
      case 'webhook_http_error':
        return $localize`:@@webhooks.httpError:Check the HTTP status and your receiver's logs.`;
      case 'webhook_destination_disallowed':
        return $localize`:@@webhooks.disallowed:Use a public HTTPS destination allowed by the webhook policy.`;
      case 'webhook_destination_unreachable':
        return $localize`:@@webhooks.unreachable:Check that the destination is reachable and accepts public connections.`;
      case 'webhook_subscription_missing':
        return $localize`:@@webhooks.missing:The subscription no longer exists.`;
      default:
        return $localize`:@@webhooks.deliveryFailed:The delivery could not be completed.`;
    }
  }
}

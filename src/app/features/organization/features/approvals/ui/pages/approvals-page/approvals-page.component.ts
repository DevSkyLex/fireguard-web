import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleDot, lucideTag } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ApprovalRequestOutput,
  ApprovalStatus,
} from '@features/organization/features/approvals/models';
import { resolveApprovalTag } from '@features/organization/features/approvals/models';
import {
  ApprovalRequestsStore,
  type ApprovalRequestsStoreType,
} from '@features/organization/features/approvals/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  REGIONAL_FORMATTING_PORT,
  type MemberDirectoryPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  CollectionFilterBar,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterOption,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { ApprovalStatusTag } from '../../components/approval-status-tag';
import {
  ApprovalDecisionDialog,
  type ApprovalDecisionTarget,
} from '../../dialogs/approval-decision-dialog';
import { ApprovalRequestTable } from '../../tables/approval-request-table';

/**
 * Constant PAGE_SIZES
 *
 * @description
 * The page sizes offered under the table — the server default first.
 */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Constant SEARCH_DEBOUNCE_MS
 *
 * @description
 * How long typing settles before the search reaches the wire.
 */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * Constant STATUS_VALUES
 *
 * @description
 * Every status chip offered in the status field's value control.
 */
const STATUS_VALUES: readonly ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
  'withdrawn',
  'cancelled',
  'expired',
];

/**
 * Type ApprovalFilterKey
 *
 * @description
 * The two keys {@link ApprovalsPage.filterFields} declares.
 *
 * @type {ApprovalFilterKey}
 */
type ApprovalFilterKey = 'status' | 'actionType';

/**
 * Component ApprovalsPage
 * @class ApprovalsPage
 *
 * @description
 * Route entry page for the organization's four-eyes approvals inbox:
 * `app-collection-filter-bar` (`@shared/collection-filters`) carries the
 * status and action-type narrowings as editable chips above the request grid
 * and the shared decision dialog gated `organization.approvals.decide`. The
 * status chip uses the shared single-value selector and projects
 * `app-approval-status-tag` into its option and selected-value templates, so
 * the raw enum never leaks into the template. The action-type chip uses the
 * same `app-collection-filter-select` (`@shared/collection-filters`), sourced
 * from the catalog endpoint. Both controls are wired to
 * {@link fieldPopoverState}/{@link onFieldPopoverStateChanged} so each opens
 * itself the instant it is picked from the bar's "+ Filter" menu
 * — the same contract every other chip on this page's sibling collection
 * pages already honours; its two-entry catalog needs no popover search.
 * Both fields are genuinely optional at the wire
 * (`ApprovalRequestListQuery`), so clearing either chip narrows to "any"
 * rather than being disabled. Free-text search is debounced before it is
 * forwarded through the list request's shared `RequestOptions` contract.
 * Owns the query the table renders (filters, paging) and the decision
 * dialog's target. On a 409 decide failure the row may have moved out from
 * under the reader (already decided, or cancelled because its subject
 * changed) — the page keeps the dialog open, showing the store's specific
 * `decideErrorText`, and silently re-reads the row (`store.refresh`) so the
 * table is correct the moment the dialog closes.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approvals-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    ApprovalStatusTag,
    ApprovalRequestTable,
    ApprovalDecisionDialog,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
    ResourceIllustration,
    StateIllustration,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucideTag,
    }),
  ],
  templateUrl: './approvals-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose approval requests are listed, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property listForbidden
   * @readonly
   *
   * @description
   * Whether the last list read was refused for lack of permission, which a retry cannot fix.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(() =>
    this.store.isListForbidden(),
  );

  //#endregion

  //#region Properties
  /**
   * Property regionalFormattingPort
   * @readonly
   *
   * @description
   * The active organization's regional formatting context port.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property memberDirectory
   * @readonly
   *
   * @description
   * Member directory used only to turn approval actor references into names.
   *
   * @access private
   * @since unreleased
   *
   * @type {MemberDirectoryPort}
   */
  private readonly memberDirectory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, read by `appOrgDate` bindings and
   * forwarded to date-rendering children.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property memberLabelOf
   * @readonly
   *
   * @description
   * Resolves an approval requester or decider through the organization member directory.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {(memberId: string) => string}
   */
  protected readonly memberLabelOf: (memberId: string) => string = (memberId: string): string =>
    this.memberDirectory.displayNameFor(memberId);

  /**
   * Property memberAvatarOf
   * @readonly
   *
   * @description
   * Resolves an approval requester to their directory avatar URL, when set.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {(memberId: string) => string | undefined}
   */
  protected readonly memberAvatarOf: (memberId: string) => string | undefined = (
    memberId: string,
  ): string | undefined => this.memberDirectory.byId().get(memberId)?.avatarUrl;

  /**
   * Property store
   * @readonly
   *
   * @description
   * The list and decision dataset, provided by this route.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ApprovalRequestsStoreType}
   */
  protected readonly store: ApprovalRequestsStoreType =
    inject<ApprovalRequestsStoreType>(ApprovalRequestsStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating the decision dialog.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Every status offered by the status field's single-value selector.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = STATUS_VALUES.map(
    (status: ApprovalStatus): CollectionFilterOption => ({
      value: status,
      label: resolveApprovalTag(status).label,
    }),
  );

  /**
   * Property status
   * @readonly
   *
   * @description
   * The active status narrowing, or `null` for every status. `pending` is the default, actionable
   * view on arrival — the reader clears the chip to see every status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<ApprovalStatus | null>}
   */
  protected readonly status: WritableSignal<ApprovalStatus | null> = signal<ApprovalStatus | null>(
    'pending',
  );

  /**
   * Property actionType
   * @readonly
   *
   * @description
   * The active action-type narrowing, or `null` for every type.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly actionType: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property draftSearch
   * @readonly
   *
   * @description
   * What the search box holds before the debounce settles.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The trimmed free-text search currently sent to the list endpoint.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly searchTerm: WritableSignal<string> = signal<string>('');

  /**
   * Property page
   * @readonly
   *
   * @description
   * The page window, one-based.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * How many rows a page holds.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /**
   * Property decisionTarget
   * @readonly
   *
   * @description
   * The row and decision currently opened in the confirm dialog, or `null` when it is closed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ApprovalDecisionTarget | null>}
   */
  protected readonly decisionTarget: WritableSignal<ApprovalDecisionTarget | null> =
    signal<ApprovalDecisionTarget | null>(null);

  /**
   * Property currentDecisionTarget
   * @readonly
   *
   * @description
   * Retains dialog identity while showing the latest server resource.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ApprovalDecisionTarget | null>}
   */
  protected readonly currentDecisionTarget: Signal<ApprovalDecisionTarget | null> = computed(() => {
    const target = this.decisionTarget();
    if (!target) return null;
    const current = this.store.requests().find((request) => request.id === target.request.id);
    return { ...target, request: current ?? target.request };
  });

  /**
   * Property filterFields
   * @readonly
   *
   * @description
   * The filter bar's field catalog: status, then action type.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly CollectionFilterField[]}
   */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@approvals.filter.status:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
    {
      key: 'actionType',
      fieldLabel: $localize`:@@approvals.filter.actionType:Action type`,
      icon: 'lucideTag',
      operators: ['equals'],
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => [
      ...(this.status() !== null ? ['status'] : []),
      ...(this.actionType() !== null ? ['actionType'] : []),
    ],
  );

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * Which field's value control currently renders forced open — `null` when none is.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ApprovalFilterKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<ApprovalFilterKey | null> =
    signal<ApprovalFilterKey | null>(null);

  /**
   * Property isDefaultPendingView
   * @readonly
   *
   * @description
   * Whether the page sits on its arrival narrowing — `pending` status, no action-type chip, no
   * search — the actionable "nothing to decide yet" view rather than a filtered miss.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDefaultPendingView: Signal<boolean> = computed<boolean>(
    () => this.status() === 'pending' && this.actionType() === null && this.searchTerm() === '',
  );

  /**
   * Property isFilteredMiss
   * @readonly
   *
   * @description
   * Whether an empty result comes from a narrowing other than the default arrival view — status
   * cleared or changed, an action-type chip, or a search term — so the empty state should offer to
   * clear filters rather than repeat the default copy.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isFilteredMiss: Signal<boolean> = computed<boolean>(
    () =>
      !this.isDefaultPendingView() &&
      (this.status() !== null || this.actionType() !== null || this.searchTerm() !== ''),
  );

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only.
   * Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely
   * driven by `app-collection-filter-toggle`.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /**
   * Property statusChipTemplate
   * @readonly
   *
   * @description
   * The "Status" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /**
   * Property actionTypeChipTemplate
   * @readonly
   *
   * @description
   * The "Action type" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly actionTypeChipTemplate = viewChild<TemplateRef<unknown>>('actionTypeChip');

  /**
   * Property chipTemplates
   * @readonly
   *
   * @description
   * Every filter field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates`
   * input.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    status: this.statusChipTemplate(),
    actionType: this.actionTypeChipTemplate(),
  }));

  /**
   * Property items
   * @readonly
   *
   * @description
   * The rows the table currently renders.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly ApprovalRequestOutput[]>}
   */
  protected readonly items: Signal<readonly ApprovalRequestOutput[]> = computed(() =>
    this.store.requests(),
  );

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * How many pages the current total spans, at least one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalRequests() / this.pageSize())),
  );

  /**
   * Property canDecide
   * @readonly
   *
   * @description
   * Whether the active member may open the decision dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDecide: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.APPROVALS_DECIDE),
  );

  /**
   * Property actionTypeOptions
   * @readonly
   *
   * @description
   * The action-type select's choices, from the catalog endpoint.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  protected readonly actionTypeOptions: Signal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = computed(() =>
    this.store.actionTypes().map((type) => ({ label: type.label, value: type.value })),
  );

  /**
   * Property previousDecideStatus
   *
   * @description
   * The last decide failure was a 409 — the row must be re-read once the dialog reflects it.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private previousDecideStatus: string = 'idle';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the load effect over the active filters and paging, fetches the
   * action-type catalog once, and re-reads the decision target's row on a
   * 409 without closing the dialog, so the reader sees the up-to-date state
   * the moment they dismiss it. Auto-closes the dialog on decide success.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.store.loadActionTypes();

    toObservable(this.draftSearch)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        const search: string = term.trim();
        if (search === this.searchTerm()) return;

        this.page.set(1);
        this.searchTerm.set(search);
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const status: ApprovalStatus | null = this.status();
      const actionType: string | null = this.actionType();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        if (this.decisionTarget()?.request.organizationId !== organizationId) {
          this.decisionTarget.set(null);
        }
        this.memberDirectory.ensureLoaded(organizationId);
        this.store.load({
          organizationId,
          options: { page, itemsPerPage: pageSize, search: search || undefined },
          query: { status: status ?? undefined, actionType: actionType ?? undefined },
        });
      });
    });

    effect((): void => {
      const state = this.store.decideCallState();
      const previous: string = this.previousDecideStatus;
      this.previousDecideStatus = state.status;

      untracked((): void => {
        const target: ApprovalDecisionTarget | null = this.decisionTarget();

        if (previous !== 'pending' || target === null) return;

        if (state.status === 'success') {
          this.decisionTarget.set(null);
          this.store.resetDecideOperation();
          return;
        }

        if (state.status === 'error' && state.error?.code === 409) {
          this.store.refresh([this.organizationId(), target.request.id]);
        }
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChanged
   * @method onSearchQueryChanged
   *
   * @description
   * Records a keystroke into the draft term watched by the debounce.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} term - Search text retained in the filter draft.
   *
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Method applyStatus
   * @method applyStatus
   *
   * @description
   * Narrows the list to one status from the status chip's single-value
   * selector, or clears it to `null` through the chip's remove button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} value - The selector's emitted value.
   *
   * @returns {void}
   */
  protected applyStatus(value: string | null | undefined): void {
    if (value === undefined) return;
    if (value !== null && !STATUS_VALUES.includes(value as ApprovalStatus)) return;

    this.page.set(1);
    this.status.set(value as ApprovalStatus | null);
    if (this.openFilterKey() === 'status') this.openFilterKey.set(null);
  }

  /**
   * Method showAllStatuses
   * @method showAllStatuses
   *
   * @description
   * Clears the default `pending` status narrowing only, leaving any action-type or search narrowing
   * untouched — the empty state's arrival-view action.
   *
   * @access protected
   * @since 1.3.0
   *
   * @returns {void}
   */
  protected showAllStatuses(): void {
    this.applyStatus(null);
  }

  /**
   * Method applyActionType
   * @method applyActionType
   *
   * @description
   * Narrows the list to one action type, or clears the narrowing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} value - The select's emitted value.
   *
   * @returns {void}
   */
  protected applyActionType(value: string | null | undefined): void {
    this.page.set(1);
    this.actionType.set(value ?? null);
    if (this.openFilterKey() === 'actionType') this.openFilterKey.set(null);
  }

  /**
   * Method fieldPopoverState
   * @method fieldPopoverState
   *
   * @description
   * Whether one filter chip's `app-collection-filter-select` should currently render open.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {ApprovalFilterKey} key - The field whose selector state is requested.
   *
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: ApprovalFilterKey): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @method onFieldPopoverStateChanged
   *
   * @description
   * Keeps {@link openFilterKey} in sync with one chip's value control.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {ApprovalFilterKey} key - The field whose selector changed state.
   * @param {BrnOverlayState} state - Its next state.
   *
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(key: ApprovalFilterKey, state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Property actionTypeLabelOf
   *
   * @description
   * Resolves an action-type value to its catalog label, for the select trigger and the table.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(value: string) => string}
   *
   * @param {string} value - The raw action-type key.
   *
   * @returns {string} The catalog label, or a localized "Unknown type" while the catalog has not
   *   answered — never the raw key.
   */
  protected actionTypeLabelOf = (value: string): string =>
    this.actionTypeOptions().find((option) => option.value === value)?.label ??
    $localize`:@@common.unknownType:Unknown type`;

  /**
   * Method onFieldPicked
   * @method onFieldPicked
   *
   * @description
   * Reacts to the filter bar's `fieldPicked` output by rendering the picked field's chip before it
   * carries a value.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   *
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as ApprovalFilterKey);
  }

  /**
   * Method onFieldRemoved
   * @method onFieldRemoved
   *
   * @description
   * Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} key - The field key whose chip was removed.
   *
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    if (key === 'status') {
      this.applyStatus(null);
      return;
    }

    this.applyActionType(null);
  }

  /**
   * Method toggleFiltersVisible
   * @method toggleFiltersVisible
   *
   * @description
   * Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to
   * the value it reports.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {boolean} visible - The toggle button's intended next state.
   *
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Drops every narrowing at once, returning to the first page.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.draftSearch.set('');
    this.searchTerm.set('');
    this.status.set(null);
    this.actionType.set(null);
    this.openFilterKey.set(null);
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes the page size and returns to the first page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} size - The chosen page size.
   *
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @method goToPage
   *
   * @description
   * Moves to a page within bounds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} target - The requested page.
   *
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-runs the current query, for the error state's retry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        page: this.page(),
        itemsPerPage: this.pageSize(),
        search: this.searchTerm() || undefined,
      },
      query: { status: this.status() ?? undefined, actionType: this.actionType() ?? undefined },
    });
  }

  /**
   * Method openApprove
   * @method openApprove
   *
   * @description
   * Opens the confirm dialog for approving one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ApprovalRequestOutput} request - The row activated.
   *
   * @returns {void}
   */
  protected openApprove(request: ApprovalRequestOutput): void {
    this.store.resetDecideOperation();
    this.decisionTarget.set({ mode: 'approve', request });
  }

  /**
   * Method openReject
   * @method openReject
   *
   * @description
   * Opens the confirm dialog for rejecting one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ApprovalRequestOutput} request - The row activated.
   *
   * @returns {void}
   */
  protected openReject(request: ApprovalRequestOutput): void {
    this.store.resetDecideOperation();
    this.decisionTarget.set({ mode: 'reject', request });
  }

  /**
   * Method openWithdraw
   * @method openWithdraw
   *
   * @description
   * Opens the confirm dialog for withdrawing one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ApprovalRequestOutput} request - The row activated.
   *
   * @returns {void}
   */
  protected openWithdraw(request: ApprovalRequestOutput): void {
    this.store.resetDecideOperation();
    this.decisionTarget.set({ mode: 'withdraw', request });
  }

  /**
   * Method closeDecisionDialog
   * @method closeDecisionDialog
   *
   * @description
   * Closes the decision dialog and resets its operation state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected closeDecisionDialog(): void {
    this.decisionTarget.set(null);
    this.store.resetDecideOperation();
  }

  /**
   * Method submitDecision
   * @method submitDecision
   *
   * @description
   * Calls the store for the currently opened row, with the confirmed note.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} note - The trimmed decision note, possibly empty.
   *
   * @returns {void}
   */
  protected submitDecision(note: string): void {
    const target: ApprovalDecisionTarget | null = this.decisionTarget();
    if (target === null) return;

    const params = {
      organizationId: this.organizationId(),
      requestId: target.request.id,
      note: note.length > 0 ? note : undefined,
    };

    if (target.mode === 'approve') {
      this.store.approve(params);
    } else if (target.mode === 'withdraw') {
      this.store.withdraw(params);
    } else {
      this.store.reject(params);
    }
  }
  //#endregion
}

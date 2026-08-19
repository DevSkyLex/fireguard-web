import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideShieldCheck } from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  ApprovalRequestOutput,
  ApprovalStatus,
} from '@features/organization/features/approvals/models';
import {
  ApprovalRequestsStore,
  type ApprovalRequestsStoreType,
} from '@features/organization/features/approvals/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { ApprovalStatusTag } from '../../components/approval-status-tag';
import {
  ApprovalDecisionDialog,
  type ApprovalDecisionTarget,
} from '../../dialogs/approval-decision-dialog';
import { ApprovalRequestTable } from '../../tables/approval-request-table';

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** Every status chip offered in the filter row. */
const STATUS_VALUES: readonly ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
];

/**
 * Component ApprovalsPage
 * @class ApprovalsPage
 *
 * @description
 * Route entry page for the organization's four-eyes approvals inbox: a
 * status `hlm-toggle-group` row (`pending` preselected — the default,
 * actionable view), an action-type select sourced from the catalog
 * endpoint, the request grid, and the shared decision dialog gated
 * `organization.approvals.decide`.
 *
 * Owns the query the table renders (filters, paging) and the decision
 * dialog's target. On a 409 decide failure the row may have moved out from
 * under the reader (already decided, or cancelled because its subject
 * changed) — the page keeps the dialog open, showing the store's specific
 * `decideErrorText`, and silently re-reads the row (`store.refresh`) so the
 * table is correct the moment the dialog closes.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approvals-page',
  imports: [
    EmptyState,
    ErrorState,
    ApprovalStatusTag,
    ApprovalRequestTable,
    ApprovalDecisionDialog,
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    ...HlmSelectImports,
    ...HlmToggleGroupImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideShieldCheck })],
  templateUrl: './approvals-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose approval requests are listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The list and decision dataset, provided by this route. */
  protected readonly store: ApprovalRequestsStoreType =
    inject<ApprovalRequestsStoreType>(ApprovalRequestsStore);

  /** Organization permission checks gating the decision dialog. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Every status chip offered. */
  protected readonly statusValues: readonly ApprovalStatus[] = STATUS_VALUES;

  /** The active status narrowing — `pending` is the default, actionable view. */
  protected readonly status: WritableSignal<ApprovalStatus> = signal<ApprovalStatus>('pending');

  /** The active action-type narrowing, or `null` for every type. */
  protected readonly actionType: WritableSignal<string | null> = signal<string | null>(null);

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** The row and decision currently opened in the confirm dialog, or `null` when it is closed. */
  protected readonly decisionTarget: WritableSignal<ApprovalDecisionTarget | null> =
    signal<ApprovalDecisionTarget | null>(null);

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly ApprovalRequestOutput[]> = computed(() =>
    this.store.requests(),
  );

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalRequests() / this.pageSize())),
  );

  /** Whether the active member may open the decision dialog. */
  protected readonly canDecide: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.APPROVALS_DECIDE),
  );

  /** The action-type select's choices, from the catalog endpoint. */
  protected readonly actionTypeOptions: Signal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = computed(() =>
    this.store.actionTypes().map((type) => ({ label: type.label, value: type.value })),
  );

  /** The last decide failure was a 409 — the row must be re-read once the dialog reflects it. */
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

    effect((): void => {
      const organizationId: string = this.organizationId();
      const status: ApprovalStatus = this.status();
      const actionType: string | null = this.actionType();
      const page: number = this.page();
      const pageSize: number = this.pageSize();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { page, itemsPerPage: pageSize },
          query: { status, actionType: actionType ?? undefined },
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
          this.store.refresh(this.organizationId(), target.request.id);
        }
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method applyStatus
   * @description Narrows the list to one status, from the toggle group.
   * @access protected
   * @since 1.0.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   * @returns {void}
   */
  protected applyStatus(value: string | readonly string[] | null | undefined): void {
    if (typeof value !== 'string' || !this.statusValues.includes(value as ApprovalStatus)) return;

    this.page.set(1);
    this.status.set(value as ApprovalStatus);
  }

  /**
   * Method applyActionType
   * @description Narrows the list to one action type, or clears the narrowing.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} value - The select's emitted value.
   * @returns {void}
   */
  protected applyActionType(value: string | null | undefined): void {
    this.page.set(1);
    this.actionType.set(value ?? null);
  }

  /**
   * Method actionTypeLabelOf
   * @description Resolves an action-type value to its catalog label, for the select trigger and the table.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The raw action-type key.
   * @returns {string} The catalog label, or the raw key if not yet loaded.
   */
  protected actionTypeLabelOf = (value: string): string =>
    this.actionTypeOptions().find((option) => option.value === value)?.label ?? value;

  /**
   * Method setPageSize
   * @description Changes the page size and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: { page: this.page(), itemsPerPage: this.pageSize() },
      query: { status: this.status(), actionType: this.actionType() ?? undefined },
    });
  }

  /**
   * Method openApprove
   * @description Opens the confirm dialog for approving one row.
   * @access protected
   * @since 1.0.0
   * @param {ApprovalRequestOutput} request - The row activated.
   * @returns {void}
   */
  protected openApprove(request: ApprovalRequestOutput): void {
    this.store.resetDecideOperation();
    this.decisionTarget.set({ mode: 'approve', request });
  }

  /**
   * Method openReject
   * @description Opens the confirm dialog for rejecting one row.
   * @access protected
   * @since 1.0.0
   * @param {ApprovalRequestOutput} request - The row activated.
   * @returns {void}
   */
  protected openReject(request: ApprovalRequestOutput): void {
    this.store.resetDecideOperation();
    this.decisionTarget.set({ mode: 'reject', request });
  }

  /**
   * Method closeDecisionDialog
   * @description Closes the decision dialog and resets its operation state.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected closeDecisionDialog(): void {
    this.decisionTarget.set(null);
    this.store.resetDecideOperation();
  }

  /**
   * Method submitDecision
   * @description Calls the store for the currently opened row, with the confirmed note.
   * @access protected
   * @since 1.0.0
   * @param {string} note - The trimmed decision note, possibly empty.
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
    } else {
      this.store.reject(params);
    }
  }
  //#endregion
}

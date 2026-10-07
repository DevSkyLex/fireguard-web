import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { ConnectivityService } from '@core/connectivity';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CustomerInput,
  CustomerOutput,
} from '@features/organization/features/customers/models';
import {
  CustomerStore,
  customerStoreEvents,
  type CustomerStoreType,
} from '@features/organization/features/customers/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { CollectionPagination } from '@shared/collection-pagination';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInput } from '@shared/ui/input';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { CustomerEditorSheet } from '../../sheets/customer-editor-sheet/customer-editor-sheet.component';

/**
 * Class CustomersPage
 * @class CustomersPage
 *
 * @description
 * Internal customer directory uses browser-only server pagination and explicit archive actions.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-customers-page',
  templateUrl: './customers-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CustomerStore],
  imports: [
    CustomerEditorSheet,
    CollectionPagination,
    ResourceIllustration,
    StateIllustration,
    HlmButton,
    HlmBadge,
    HlmInput,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmToggleGroupImports,
  ],
})
export class CustomersPage {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Resolved organization context from the owning route.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-local directory state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {CustomerStoreType}
   */
  protected readonly store: CustomerStoreType = inject(CustomerStore);
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Connectivity governs online directory administration without discarding drafts.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Access authority inherited from the organization context.
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
   * Property platformId
   * @readonly
   *
   * @description
   * Server work is browser-only for this secondary collection.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);
  /**
   * Property search
   * @readonly
   *
   * @description
   * Committed server search.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal('');
  /**
   * Property page
   * @readonly
   *
   * @description
   * Server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = signal(1);
  /**
   * Property archived
   * @readonly
   *
   * @description
   * Active and archived records have separate server universes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly archived: WritableSignal<boolean> = signal(false);
  /**
   * Property editorVisible
   * @readonly
   *
   * @description
   * Editor visibility is independent of the selected record.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly editorVisible: WritableSignal<boolean> = signal(false);
  /**
   * Property editing
   * @readonly
   *
   * @description
   * Immutable revision displayed when editing.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CustomerOutput | null>}
   */
  protected readonly editing: WritableSignal<CustomerOutput | null> = signal<CustomerOutput | null>(
    null,
  );
  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Customer management remains permission-gated.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_MANAGE),
  );
  /**
   * Property canRead
   * @readonly
   *
   * @description
   * Reads remain independently granted.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRead: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ),
  );
  /**
   * Property online
   * @readonly
   *
   * @description
   * Network status exposed distinctly from an empty list.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly online: Signal<boolean> = computed(() => this.connectivity.isOnline());
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Cancels old organization reads and handles successful writes once.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.organizationId();
      untracked(() => {
        this.page.set(1);
        this.search.set('');
        this.archived.set(false);
        this.editorVisible.set(false);
        this.editing.set(null);
        this.store.load(null);
      });
    });
    effect(() => {
      const query = {
        organizationId: this.organizationId(),
        page: this.page(),
        search: this.search(),
        archived: this.archived(),
      };
      const enabled = this.canRead() && this.online() && isPlatformBrowser(this.platformId);
      untracked(() => {
        if (enabled) this.store.load(query);
      });
    });
    effect(() => {
      const latest = this.store.readCallState().data;
      untracked(() => {
        if (latest?.organizationId === this.organizationId() && latest.id === this.editing()?.id) {
          this.editing.set(latest);
          this.store.clearWrite();
        }
      });
    });
    inject(Events)
      .on(customerStoreEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        this.editorVisible.set(false);
        this.editing.set(null);
        this.reload();
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method refreshRevision
   * @method
   *
   * @description
   * Reloads the record revision after a conflict without replacing entered form values.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected refreshRevision(): void {
    const customer = this.editing();
    if (customer && this.online())
      this.store.read({ organizationId: this.organizationId(), customerId: customer.id });
  }

  /**
   * Method searchChanged
   * @method
   *
   * @description
   * Applies a new server search from page one.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected searchChanged(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }
  /**
   * Method archiveFilter
   * @method
   *
   * @description
   * Switches between active and archived customer directories.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected archiveFilter(value: unknown): void {
    if (value === 'active' || value === 'archived') {
      this.archived.set(value === 'archived');
      this.page.set(1);
    }
  }
  /**
   * Method open
   * @method
   *
   * @description
   * Opens a fresh editor without carrying a previous rejection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CustomerOutput | null} customer - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected open(customer: CustomerOutput | null): void {
    if (!this.canManage() || !this.online()) return;
    this.store.clearWrite();
    this.store.read(null);
    this.editing.set(customer);
    this.editorVisible.set(true);
  }
  /**
   * Method submitted
   * @method
   *
   * @description
   * Saves against the displayed revision, keeping drafts until confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CustomerInput} payload - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected submitted(payload: CustomerInput): void {
    if (!this.canManage() || !this.online()) return;
    const customer = this.editing();
    this.store.save(
      customer
        ? { kind: 'update', organizationId: this.organizationId(), customer, input: payload }
        : { kind: 'create', organizationId: this.organizationId(), input: payload },
    );
  }
  /**
   * Method archive
   * @method
   *
   * @description
   * Archives or restores a revision-checked customer, preserving existing links.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CustomerOutput} customer - Value supplied by the owning customer workflow.
   *
   * @returns {void} No return value.
   */
  protected archive(customer: CustomerOutput): void {
    if (!this.canManage() || !this.online()) return;
    this.store.save({
      kind: customer.archivedAt ? 'restore' : 'archive',
      organizationId: this.organizationId(),
      customer,
    });
  }
  /**
   * Method reload
   * @method
   *
   * @description
   * Retries the same committed directory query.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected reload(): void {
    if (this.canRead() && this.online() && isPlatformBrowser(this.platformId))
      this.store.load({
        organizationId: this.organizationId(),
        page: this.page(),
        search: this.search(),
        archived: this.archived(),
      });
  }
  //#endregion
}

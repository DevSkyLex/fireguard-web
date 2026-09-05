import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  computed,
  untracked,
  afterNextRender,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { UpdateChecklistInput } from '@features/organization/features/checklists/models';
import {
  ActiveChecklistStore,
  ChecklistStore,
} from '@features/organization/features/checklists/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';
import { ChecklistStatusTag } from '../../components/checklist-status-tag';
import { ChecklistEditForm } from '../../forms/checklist-edit-form';
/**
 * Component ChecklistDetailPage
 * @class ChecklistDetailPage
 * @description Dedicated checklist editor with protected drafts and a read-only archive. Browser-only loading avoids serializing authenticated templates in SSR.
 * @since 1.0.0
 */
@Component({
  selector: 'app-checklist-detail-page',
  imports: [HlmButton, HlmSkeleton, ChecklistEditForm, ChecklistStatusTag, UnsavedChangesDialog],
  providers: [ActiveChecklistStore, ChecklistStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
  templateUrl: './checklist-detail-page.component.html',
})
export class ChecklistDetailPage implements UnsavedChangesAware {
  /**
   * Property organizationId
   * @readonly
   * @description Organization scope supplied by the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property checklistId
   * @readonly
   * @description Checklist identifier, absent on the creation route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly checklistId = input<string | undefined>();
  /**
   * Property active
   * @readonly
   * @description Scoped resolved checklist context used by this page.
   * @access protected
   * @since 1.0.0
   * @type {InstanceType<typeof ActiveChecklistStore>}
   */
  protected readonly active = inject(ActiveChecklistStore);
  /**
   * Property store
   * @readonly
   * @description Owning feature store for checklist creation and updates.
   * @access protected
   * @since 1.0.0
   * @type {InstanceType<typeof ChecklistStore>}
   */
  protected readonly store = inject(ChecklistStore);
  /**
   * Property access
   * @readonly
   * @description Organization permission source used to gate write controls.
   * @access private
   * @since 1.0.0
   * @type {InstanceType<typeof OrganizationPermissionService>}
   */
  private readonly access = inject(OrganizationPermissionService);
  /**
   * Property router
   * @readonly
   * @description Navigates between the owning feature routes.
   * @access private
   * @since 1.0.0
   * @type {InstanceType<typeof Router>}
   */
  private readonly router = inject(Router);
  /**
   * Property destroyRef
   * @readonly
   * @description Cancels page subscriptions and guards asynchronous continuations after teardown.
   * @access private
   * @since 1.0.0
   * @type {InstanceType<typeof DestroyRef>}
   */
  private readonly destroyRef = inject(DestroyRef);
  /**
   * Property browserReady
   * @readonly
   * @description Browser activation gate for secondary authenticated reads.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly browserReady = signal(false);
  /**
   * Property dirty
   * @readonly
   * @description Whether the current draft differs from its accepted baseline.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty = signal(false);
  /**
   * Property discardOpen
   * @readonly
   * @description Visibility of the unsaved-changes confirmation.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly discardOpen = signal(false);
  /**
   * Property resolveDiscard
   * @description Pending route-guard decision awaiting the operator’s response.
   * @access private
   * @since 1.0.0
   * @type {((value: boolean)}
   */
  private resolveDiscard: ((value: boolean) => void) | null = null;
  /**
   * Property canWrite
   * @readonly
   * @description Whether the current member may edit this active checklist.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWrite = computed(
    () =>
      this.access.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE) &&
      this.active.selectedChecklist()?.status !== 'archived',
  );
  /**
   * Property pending
   * @readonly
   * @description Whether the form submission is awaiting its result.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly pending = computed(() => this.store.isCreating() || this.store.isUpdating());
  /**
   * Constructor
   * @constructor
   * @description Registers draft, route and browser lifecycle coordination.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.browserReady.set(true));
    effect((onCleanup) => {
      if (!this.browserReady()) return;
      const org = this.organizationId();
      const id = this.checklistId();
      untracked(() => {
        this.active.clear();
        this.dirty.set(false);
        if (id) {
          const subscription = this.active
            .resolveChecklist(org, id)
            .subscribe({ error: () => undefined });
          onCleanup(() => subscription.unsubscribe());
        }
      });
    });
    effect(() => {
      const created = this.store.createCallState().data;
      if (created)
        untracked(() => {
          this.dirty.set(false);
          void this.router.navigate(
            ['/organizations', this.organizationId(), 'checklists', created.id],
            { replaceUrl: true },
          );
        });
    });
    effect(() => {
      if (this.store.updateCallState().status === 'success') this.dirty.set(false);
    });
  }
  /**
   * Method reload
   * @method reload
   * @description Retries loading the current checklist after a failed read.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    const id = this.checklistId();
    if (id)
      this.active
        .resolveChecklist(this.organizationId(), id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => undefined });
  }
  /**
   * Method save
   * @method save
   * @description Submits the full validated checklist draft through the owning store.
   * @access protected
   * @since 1.0.0
   * @param {UpdateChecklistInput} payload - Validated replacement values.
   * @returns {void}
   */
  protected save(payload: UpdateChecklistInput): void {
    if (!this.canWrite() || this.pending()) return;
    const id = this.checklistId();
    if (id)
      this.store.update({ organizationId: this.organizationId(), checklistId: id, input: payload });
    else
      this.store.create({
        organizationId: this.organizationId(),
        input: { name: payload.name ?? '', version: '1.0', items: payload.items ?? [] },
      });
  }
  /**
   * Method back
   * @method back
   * @description Returns to the checklist collection through the unsaved-changes guard.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected back(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'checklists']);
  }
  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   * @description Reports dirty input or an in-flight submission to the route guard.
   * @access public
   * @since 1.0.0
   * @returns {boolean}
   */
  public hasUnsavedChanges(): boolean {
    return this.dirty() || this.pending();
  }
  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   * @description Defers navigation until the user confirms discard; pending writes cannot be abandoned.
   * @access public
   * @since 1.0.0
   * @returns {Promise<boolean>}
   */
  public confirmDeactivation(): Promise<boolean> {
    if (this.pending()) return Promise.resolve(false);
    this.discardOpen.set(true);
    return new Promise((resolve) => {
      this.resolveDiscard = resolve;
    });
  }
  /**
   * Method resolveLeave
   * @method resolveLeave
   * @description Resolves the pending route-guard decision exactly once.
   * @access protected
   * @since 1.0.0
   * @param {boolean} discard - Whether unsaved input may be abandoned.
   * @returns {void}
   */
  protected resolveLeave(discard: boolean): void {
    this.discardOpen.set(false);
    this.resolveDiscard?.(discard);
    this.resolveDiscard = null;
  }
  /**
   * Method beforeUnload
   * @method beforeUnload
   * @description Protects unsaved input when the browser leaves or reloads this page.
   * @access protected
   * @since 1.0.0
   * @param {BeforeUnloadEvent} event - Native unload event.
   * @returns {void}
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}

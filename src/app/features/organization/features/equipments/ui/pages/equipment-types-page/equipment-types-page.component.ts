import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { ConnectivityService } from '@core/connectivity';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  CreateEquipmentTypeInput,
  EquipmentFamily,
  EquipmentTypeOutput,
} from '@features/organization/features/equipments/models';
import {
  EquipmentTypeAdministrationStore,
  equipmentTypeAdministrationEvents,
  type EquipmentTypeAdministrationStoreType,
} from '@features/organization/features/equipments/state/equipment-type-administration';
import { EquipmentTypeForm } from '@features/organization/features/equipments/ui/forms/equipment-type-form';
import { equipmentTypeOption } from '@features/organization/features/equipments/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { UnsavedChangesDialog, type UnsavedChangesAware } from '@shared/unsaved-changes';

/**
 * Constant FAMILY_LABELS
 *
 * @description
 * Human-readable family labels keep wire codes out of templates.
 */
const FAMILY_LABELS: Record<EquipmentFamily, string> = {
  fire: $localize`:@@equipment.catalog.family.fire:Fire`,
  safety: $localize`:@@equipment.catalog.family.safety:Safety`,
  other: $localize`:@@equipment.catalog.family.other:Other`,
};

/**
 * Class EquipmentTypesPage
 * @class EquipmentTypesPage
 *
 * @description
 * Organization catalogue administration with retained revisions and protected editor drafts.
 */
@Component({
  selector: 'app-equipment-types-page',
  templateUrl: './equipment-types-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EquipmentTypeAdministrationStore],
  imports: [
    EquipmentTypeForm,
    UnsavedChangesDialog,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmSheetImports,
    ...HlmTableImports,
    ...HlmToggleGroupImports,
  ],
})
export class EquipmentTypesPage implements UnsavedChangesAware {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Route-owned organization authority.
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
   * Page-local catalogue and command state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentTypeAdministrationStoreType}
   */
  protected readonly store: EquipmentTypeAdministrationStoreType = inject(
    EquipmentTypeAdministrationStore,
  );

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission source governs every management action.
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
   * Property connectivity
   * @readonly
   *
   * @description
   * Catalogue administration needs a confirmed online command.
   *
   * @access private
   * @since unreleased
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Prevents private catalogue reads during SSR.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * The server and interface share the equipment-write permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canManage: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /**
   * Property online
   * @readonly
   *
   * @description
   * Network status disables commands without discarding the editor.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly online: Signal<boolean> = computed(() => this.connectivity.isOnline());

  /**
   * Property editorVisible
   * @readonly
   *
   * @description
   * Visibility is distinct from whether the editor creates or edits.
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
   * Descriptor whose revision has been reviewed by the operator.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<EquipmentTypeOutput | null>}
   */
  protected readonly editing: WritableSignal<EquipmentTypeOutput | null> =
    signal<EquipmentTypeOutput | null>(null);

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Local filter over the complete catalogue, including historical archived entries.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly archived: WritableSignal<boolean> = signal(false);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Actual form dirty state protects dismissal and route navigation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);

  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * One hosted discard dialog serves editor dismissal and route navigation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly confirmation: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property revisionRefresh
   * @readonly
   *
   * @description
   * Explicit operator request to review the latest descriptor after a conflict.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly revisionRefresh: WritableSignal<boolean> = signal(false);

  /**
   * Property deactivationResolver
   *
   * @description
   * Pending route confirmation is resolved exactly once by the hosted dialog.
   *
   * @access private
   * @since unreleased
   *
   * @type {((allowed: boolean) => void) | null}
   */
  private deactivationResolver: ((allowed: boolean) => void) | null = null;

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Localized catalogue rows retain server descriptors for revision-safe commands.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   readonly { entry: EquipmentTypeOutput; displayLabel: string; familyLabel: string }[]
   * >}
   */
  protected readonly rows: Signal<
    readonly { entry: EquipmentTypeOutput; displayLabel: string; familyLabel: string }[]
  > = computed(() =>
    this.store
      .equipmentTypeEntities()
      .filter((entry) => entry.archived === this.archived())
      .map((entry) => ({
        entry,
        displayLabel: equipmentTypeOption(entry).label,
        familyLabel: FAMILY_LABELS[entry.family],
      })),
  );

  /**
   * Property editorTitle
   * @readonly
   *
   * @description
   * Native sheet title reflects create or edit intent.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly editorTitle: Signal<string> = computed(() =>
    this.editing()
      ? $localize`:@@equipment.catalog.edit:Edit equipment type`
      : $localize`:@@equipment.catalog.new:New equipment type`,
  );

  /**
   * Property side
   * @readonly
   *
   * @description
   * Responsive native sheet position.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property familyLabel
   * @readonly
   *
   * @description
   * Localizes reviewed server families without changing command payloads.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(family: EquipmentFamily) => string}
   */
  protected readonly familyLabel: (family: EquipmentFamily) => string = (family) =>
    FAMILY_LABELS[family];
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads only in the browser and closes an editor only after server confirmation.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.organizationId();
      untracked(() => {
        this.editorVisible.set(false);
        this.editing.set(null);
        this.dirty.set(false);
        this.archived.set(false);
        this.revisionRefresh.set(false);
        this.store.load(null);
      });
    });
    effect(() => {
      const organizationId = this.organizationId();
      const enabled = this.canManage() && this.online() && isPlatformBrowser(this.platformId);
      untracked(() => {
        if (enabled) this.store.load(organizationId);
      });
    });
    effect(() => {
      const refreshed = this.revisionRefresh();
      const callState = this.store.listCallState();
      untracked(() => {
        if (!refreshed || callState.status !== 'success') return;
        const current = this.editing();
        const latest = current
          ? this.store.equipmentTypeEntities().find((entry) => entry.value === current.value)
          : null;
        if (latest) this.editing.set(latest);
        this.revisionRefresh.set(false);
      });
    });
    inject(Events)
      .on(equipmentTypeAdministrationEvents.saved)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (payload.organizationId !== this.organizationId()) return;
        this.editorVisible.set(false);
        this.editing.set(null);
        this.dirty.set(false);
      });
    inject(DestroyRef).onDestroy(() => {
      this.deactivationResolver?.(false);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Starts an editor without carrying a previous command rejection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentTypeOutput | null} entry - Reviewed descriptor or creation intent.
   *
   * @returns {void}
   */
  protected open(entry: EquipmentTypeOutput | null): void {
    if (!this.canManage() || !this.online() || this.store.writeCallState().status === 'pending')
      return;
    this.store.clearWrite();
    this.editing.set(entry);
    this.dirty.set(false);
    this.editorVisible.set(true);
  }

  /**
   * Method submitted
   * @method submitted
   *
   * @description
   * Saves reviewed fields without allowing a form to mutate the permanent code.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CreateEquipmentTypeInput} submission - Validated catalogue fields.
   *
   * @returns {void}
   */
  protected submitted(submission: CreateEquipmentTypeInput): void {
    if (!this.canManage() || !this.online()) return;
    const entry = this.editing();
    this.store.save(
      entry
        ? {
            kind: 'update',
            organizationId: this.organizationId(),
            value: entry.value,
            input: { revision: entry.revision, label: submission.label, family: submission.family },
          }
        : { kind: 'create', organizationId: this.organizationId(), input: submission },
    );
  }

  /**
   * Method archive
   * @method archive
   *
   * @description
   * Archives or restores a descriptor without deleting historical equipment labels.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentTypeOutput} entry - Descriptor and observed revision.
   *
   * @returns {void}
   */
  protected archive(entry: EquipmentTypeOutput): void {
    if (!this.canManage() || !this.online()) return;
    this.store.save({
      kind: 'update',
      organizationId: this.organizationId(),
      value: entry.value,
      input: { revision: entry.revision, archived: !entry.archived },
    });
  }

  /**
   * Method archiveFilter
   * @method archiveFilter
   *
   * @description
   * Applies a local filter to the complete server catalogue.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native toggle selection.
   *
   * @returns {void}
   */
  protected archiveFilter(value: unknown): void {
    if (value === 'active' || value === 'archived') this.archived.set(value === 'archived');
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Retries catalogue reads without silently changing an editor's reviewed revision.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected reload(): void {
    if (this.canManage() && this.online() && isPlatformBrowser(this.platformId))
      this.store.load(this.organizationId());
  }

  /**
   * Method refreshRevision
   * @method refreshRevision
   *
   * @description
   * Explicitly reviews the latest revision after a conflict while retaining entered fields.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected refreshRevision(): void {
    if (!this.canManage() || !this.online()) return;
    this.revisionRefresh.set(true);
    this.reload();
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * Prevents accepted commands from being cancelled and confirms discarding dirty edits.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.store.writeCallState().status === 'pending') return;
    if (this.dirty()) this.confirmation.set('open');
    else this.editorVisible.set(false);
  }

  /**
   * Method stateChanged
   * @method stateChanged
   *
   * @description
   * Native sheet dismissals follow the same draft-protection policy.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - Requested sheet state.
   *
   * @returns {void}
   */
  protected stateChanged(state: BrnDialogState): void {
    if (state === 'closed' && this.editorVisible()) this.requestClose();
  }

  /**
   * Method hasUnsavedChanges
   * @method hasUnsavedChanges
   *
   * @description
   * Accepted commands and modified drafts require controlled navigation.
   *
   * @access public
   * @since unreleased
   *
   * @returns {boolean} Whether navigation requires the page's decision.
   */
  public hasUnsavedChanges(): boolean {
    return this.dirty() || this.store.writeCallState().status === 'pending';
  }

  /**
   * Method confirmDeactivation
   * @method confirmDeactivation
   *
   * @description
   * Blocks navigation during an accepted command; otherwise asks whether to discard the draft.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<boolean>} Operator decision about leaving the editor.
   */
  public confirmDeactivation(): Promise<boolean> {
    if (this.store.writeCallState().status === 'pending') return Promise.resolve(false);
    this.confirmation.set('open');
    return new Promise((resolve) => {
      this.deactivationResolver = resolve;
    });
  }

  /**
   * Method resolveConfirmation
   * @method resolveConfirmation
   *
   * @description
   * Resolves the active editor or route discard request exactly once.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} allowed - Whether the operator confirmed discarding input.
   *
   * @returns {void}
   */
  protected resolveConfirmation(allowed: boolean): void {
    this.confirmation.set('closed');
    if (allowed) {
      this.editorVisible.set(false);
      this.dirty.set(false);
    }
    this.deactivationResolver?.(allowed);
    this.deactivationResolver = null;
  }
  //#endregion
}

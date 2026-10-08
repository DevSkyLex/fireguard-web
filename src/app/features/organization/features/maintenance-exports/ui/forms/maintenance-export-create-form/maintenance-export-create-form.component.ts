import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type { HydraCollection } from '@core/api/models';
import type { CallState, StoreError } from '@core/request-state';
import type {
  MaintenanceExportSourceOutput,
  CreateMaintenanceExportInput,
} from '@features/organization/features/maintenance-exports/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Class MaintenanceExportCreateForm
 * @class MaintenanceExportCreateForm
 *
 * @description
 * Native creation draft keeps published choices across server pages and emits bounded exact intent.
 */
@Component({
  selector: 'app-maintenance-export-create-form',
  templateUrl: './maintenance-export-create-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    HlmCheckbox,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
})
export class MaintenanceExportCreateForm {
  //#region Properties
  /**
   * Property sources
   * @readonly
   *
   * @description
   * Server-paginated published dossier choices and readiness state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState<HydraCollection<MaintenanceExportSourceOutput>>>}
   */
  public readonly sources: InputSignal<CallState<HydraCollection<MaintenanceExportSourceOutput>>> =
    input.required();
  /**
   * Property sourcePage
   * @readonly
   *
   * @description
   * Current published dossier selector page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly sourcePage: InputSignal<number> = input(1);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether an accepted command is waiting for its acknowledgement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property locked
   * @readonly
   *
   * @description
   * Whether editing is prohibited by permissions, connectivity or receipt recovery.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly locked: InputSignal<boolean> = input(false);
  /**
   * Property canIncludeCosts
   * @readonly
   *
   * @description
   * Independent financial permission enabling the explicit private cost opt-in.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canIncludeCosts: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable server rejection shown beside the unchanged draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated native form intent; the owning page accepts the write.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<
   *     Omit<CreateMaintenanceExportInput, 'clientOperationId'>
   *   >}
   */
  public readonly submitted: OutputEmitterRef<
    Omit<CreateMaintenanceExportInput, 'clientOperationId'>
  > = output();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Intent to dismiss the draft through the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output();
  /**
   * Property searchChanged
   * @readonly
   *
   * @description
   * Committed published dossier search intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchChanged: OutputEmitterRef<string> = output();
  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Intent to select a different authoritative server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Native form dirtiness used by guarded dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output();
  /**
   * Property search
   * @readonly
   *
   * @description
   * Uncommitted search text, separate from the server query.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly search: WritableSignal<string> = signal('');
  /**
   * Property selection
   * @readonly
   *
   * @description
   * Readable published choices retained across selector pages.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<readonly MaintenanceExportSourceOutput[]>}
   */
  protected readonly selection: WritableSignal<readonly MaintenanceExportSourceOutput[]> = signal(
    [],
  );
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable native form values; exact strings remain unchanged until validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{
   *   system: string;
   *   includeInternalCosts: boolean;
   *   interventionIds: string[];
   * }>}
   */
  protected readonly draft: WritableSignal<{
    system: string;
    includeInternalCosts: boolean;
    interventionIds: string[];
  }> = signal({ system: '', includeInternalCosts: false, interventionIds: [] });
  /**
   * Property fields
   * @readonly
   *
   * @description
   * Signal Forms schema, validation and real field state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{
   *   system: string;
   *   includeInternalCosts: boolean;
   *   interventionIds: string[];
   * }>}
   */
  protected readonly fields: FieldTree<{
    system: string;
    includeInternalCosts: boolean;
    interventionIds: string[];
  }> = form(this.draft, (path) => {
    disabled(path, () => this.pending() || this.locked());
    required(path.system, {
      message: $localize`:@@maintenanceExport.form.systemRequired:Enter the external system code.`,
    });
    maxLength(path.system, 40);
    validate(path.system, ({ value }) =>
      /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/.test(value().trim())
        ? null
        : {
            kind: 'system',
            message: $localize`:@@maintenanceExport.form.systemInvalid:Use letters, numbers, dots, underscores or hyphens (up to 40 characters).`,
          },
    );
    validate(path.interventionIds, ({ value }) =>
      value().length >= 1 && value().length <= 100
        ? null
        : {
            kind: 'selection',
            message: $localize`:@@maintenanceExport.form.selectionRequired:Select between 1 and 100 ready published dossiers.`,
          },
    );
    disabled(path.includeInternalCosts, () => !this.canIncludeCosts());
  });

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Connects native draft, authenticated scope and acknowledged command consequences.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => this.dirtyChanged.emit(this.fields().dirty()));
    effect(() => {
      if (!this.canIncludeCosts())
        untracked(() => this.draft.update((draft) => ({ ...draft, includeInternalCosts: false })));
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Updates only ready published selections and marks the native form dirty.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceExportSourceOutput} source - Explicit source supplied by the owning
   *   workflow.
   * @param {boolean} checked - Explicit checked supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected toggle(source: MaintenanceExportSourceOutput, checked: boolean): void {
    if (this.fields().disabled() || !source.ready) return;
    this.selection.update((items) =>
      checked
        ? items.some((item) => item.id === source.id)
          ? items
          : [...items, source]
        : items.filter((item) => item.id !== source.id),
    );
    this.draft.update((draft) => ({
      ...draft,
      interventionIds: this.selection().map((item) => item.id),
    }));
    this.fields().markAsDirty();
  }

  /**
   * Method selected
   * @method selected
   *
   * @description
   * Checks whether a published identity is retained in the cross-page draft.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} id - Explicit id supplied by the owning workflow.
   *
   * @returns {boolean} Result for the current authorized archive workflow.
   */
  protected selected(id: string): boolean {
    return this.draft().interventionIds.includes(id);
  }

  /**
   * Method blockedLabel
   * @method blockedLabel
   *
   * @description
   * Explains the server readiness blocker without inventing compliance status.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceExportSourceOutput} source - Explicit source supplied by the owning
   *   workflow.
   *
   * @returns {string} Result for the current authorized archive workflow.
   */
  protected blockedLabel(source: MaintenanceExportSourceOutput): string {
    const labels: Readonly<Record<string, string>> = {
      snapshot_missing: $localize`:@@maintenanceExport.form.snapshotMissing:Historical publication snapshot missing. This dossier cannot be exported.`,
      no_validated_work: $localize`:@@maintenanceExport.form.noValidatedWork:No validated work is retained in this dossier. It cannot be exported.`,
    };
    return labels[source.blockedReason ?? 'snapshot_missing'] ?? labels['snapshot_missing'] ?? '';
  }

  /**
   * Method searchInput
   * @method searchInput
   *
   * @description
   * Retains uncommitted search text without issuing transport requests.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native control event.
   *
   * @returns {void} No return value.
   */
  protected searchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.search.set(target.value);
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Validates native field state and emits the exact accepted form intent.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native control event.
   *
   * @returns {void} No return value.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.fields().invalid() || this.fields().disabled()) return;
    this.submitted.emit({
      system: this.draft().system.trim(),
      includeInternalCosts: this.canIncludeCosts() && this.draft().includeInternalCosts,
      interventionIds: [...this.draft().interventionIds],
    });
  }
  //#endregion
}

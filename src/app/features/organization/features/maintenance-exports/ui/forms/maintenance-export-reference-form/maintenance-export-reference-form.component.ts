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
import type { CallState, StoreError } from '@core/request-state';
import type {
  MaintenanceExportReferenceOutput,
  MaintenanceExportResourceType,
  MaintenanceExportReferencePage,
} from '@features/organization/features/maintenance-exports/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Class MaintenanceExportReferenceForm
 * @class MaintenanceExportReferenceForm
 *
 * @description
 * Selects readable scoped owner identities and emits a reviewed optimistic mapping intent.
 */
@Component({
  selector: 'app-maintenance-export-reference-form',
  templateUrl: './maintenance-export-reference-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmSelectImports,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmToggleGroupImports,
  ],
})
export class MaintenanceExportReferenceForm {
  //#region Properties
  /**
   * Property targets
   * @readonly
   *
   * @description
   * Readable authorized owner directory page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<
   *     CallState<MaintenanceExportReferencePage>
   *   >}
   */
  public readonly targets: InputSignal<CallState<MaintenanceExportReferencePage>> =
    input.required();
  /**
   * Property mapping
   * @readonly
   *
   * @description
   * Current scoped mapping read used as optimistic revision authority.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState<MaintenanceExportReferenceOutput | null>>}
   */
  public readonly mapping: InputSignal<CallState<MaintenanceExportReferenceOutput | null>> =
    input.required();
  /**
   * Property targetPage
   * @readonly
   *
   * @description
   * Current resource directory page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly targetPage: InputSignal<number> = input(1);
  /**
   * Property allowedTypes
   * @readonly
   *
   * @description
   * Owner types whose separate directory read permissions are granted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly MaintenanceExportResourceType[]>}
   */
  public readonly allowedTypes: InputSignal<readonly MaintenanceExportResourceType[]> =
    input.required();
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
   * @type {OutputEmitterRef<{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly resourceId: string;
   *   readonly system: string;
   *   readonly reference: string;
   *   readonly revision: number;
   * }>}
   */
  public readonly submitted: OutputEmitterRef<{
    readonly resourceType: MaintenanceExportResourceType;
    readonly resourceId: string;
    readonly system: string;
    readonly reference: string;
    readonly revision: number;
  }> = output();
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
   * Property targetQueryChanged
   * @readonly
   *
   * @description
   * Bounded readable directory query emitted to the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly page: number;
   *   readonly search: string;
   *   readonly archived?: boolean;
   * }>}
   */
  public readonly targetQueryChanged: OutputEmitterRef<{
    readonly resourceType: MaintenanceExportResourceType;
    readonly page: number;
    readonly search: string;
    readonly archived?: boolean;
  }> = output();
  /**
   * Property mappingQueryChanged
   * @readonly
   *
   * @description
   * Exact mapping tuple whose latest revision must be read before submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<{
   *   readonly resourceType: MaintenanceExportResourceType;
   *   readonly resourceId: string;
   *   readonly system: string;
   * } | null>}
   */
  public readonly mappingQueryChanged: OutputEmitterRef<{
    readonly resourceType: MaintenanceExportResourceType;
    readonly resourceId: string;
    readonly system: string;
  } | null> = output();
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
   * Property archivedCustomers
   * @readonly
   *
   * @description
   * Explicit customer lifecycle scope for historical resource mappings.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly archivedCustomers: WritableSignal<boolean> = signal(false);
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
   *   resourceType: MaintenanceExportResourceType;
   *   resourceId: string;
   *   system: string;
   *   reference: string;
   * }>}
   */
  protected readonly draft: WritableSignal<{
    resourceType: MaintenanceExportResourceType;
    resourceId: string;
    system: string;
    reference: string;
  }> = signal({ resourceType: 'customer', resourceId: '', system: '', reference: '' });
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
   *   resourceType: MaintenanceExportResourceType;
   *   resourceId: string;
   *   system: string;
   *   reference: string;
   * }>}
   */
  protected readonly fields: FieldTree<{
    resourceType: MaintenanceExportResourceType;
    resourceId: string;
    system: string;
    reference: string;
  }> = form(this.draft, (path) => {
    disabled(path, { when: () => this.locked() || this.pending() });
    required(path.resourceId, {
      message: $localize`:@@maintenanceExport.reference.targetRequired:Select an authorized resource.`,
    });
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
    required(path.reference, {
      message: $localize`:@@maintenanceExport.reference.valueRequired:Enter the external resource reference.`,
    });
    validate(path.reference, ({ value }) =>
      Array.from(value().trim()).length <= 200
        ? null
        : {
            kind: 'maxLength',
            message: $localize`:@@maintenanceExport.form.limit200:Use no more than 200 characters.`,
          },
    );
  });
  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Localized owner type labels for the native selector.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly typeLabelOf: (value: unknown) => string = (value) => {
    const labels: Readonly<Record<string, string>> = {
      customer: $localize`:@@maintenanceExport.reference.customer:Customer`,
      site: $localize`:@@maintenanceExport.reference.site:Site`,
      equipment: $localize`:@@maintenanceExport.reference.equipment:Equipment`,
    };
    return typeof value === 'string' ? (labels[value] ?? '') : '';
  };
  /**
   * Property targetLabelOf
   * @readonly
   *
   * @description
   * Readable selected owner identity, retained while another page is visible.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly targetLabelOf: (value: unknown) => string = (value) =>
    typeof value === 'string'
      ? (this.targets().data?.member.find((target) => target.id === value)?.label ??
        this.selectedLabel)
      : '';
  /**
   * Property selectedLabel
   *
   * @description
   * Last readable selected identity, preserving its native selector label.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private selectedLabel: string = '';
  /**
   * Property selectedType
   *
   * @description
   * Owner type whose directory was most recently requested.
   *
   * @access private
   * @since unreleased
   *
   * @type {MaintenanceExportResourceType | null}
   */
  private selectedType: MaintenanceExportResourceType | null = null;

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
      const allowed = this.allowedTypes();
      if (allowed.length && !allowed.includes(this.draft().resourceType))
        untracked(() =>
          this.draft.update((draft) => ({
            ...draft,
            resourceType: allowed[0] ?? 'customer',
            resourceId: '',
            reference: '',
          })),
        );
    });
    effect(() => {
      const type = this.fields.resourceType().value();
      if (this.selectedType === type) return;
      this.selectedType = type;
      untracked(() => {
        this.draft.update((draft) => ({ ...draft, resourceId: '', reference: '' }));
        this.selectedLabel = '';
        this.search.set('');
        this.archivedCustomers.set(false);
        this.targetQueryChanged.emit({
          resourceType: type,
          page: 1,
          search: '',
          ...(type === 'customer' ? { archived: false } : {}),
        });
      });
    });
    effect(() => {
      const system = this.fields.system().value().trim(),
        resourceType = this.fields.resourceType().value(),
        resourceId = this.fields.resourceId().value();
      untracked(() => {
        if (resourceId)
          this.selectedLabel =
            this.targets().data?.member.find((item) => item.id === resourceId)?.label ??
            this.selectedLabel;
        this.mappingQueryChanged.emit(
          system && resourceId && !this.fields.system().invalid()
            ? { system, resourceType, resourceId }
            : null,
        );
      });
    });
    effect(() => {
      const mapping = this.mapping();
      if (mapping.status === 'success' && !this.fields.reference().dirty())
        untracked(() =>
          this.draft.update((draft) => ({ ...draft, reference: mapping.data?.reference ?? '' })),
        );
    });
  }

  //#endregion

  //#region Methods
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
    if (event.target instanceof HTMLInputElement) this.search.set(event.target.value);
  }

  /**
   * Method searchTargets
   * @method searchTargets
   *
   * @description
   * Emits one bounded authorized directory query.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - Explicit page supplied by the owning workflow.
   *
   * @returns {void} No return value.
   */
  protected searchTargets(page: number = 1): void {
    this.targetQueryChanged.emit({
      resourceType: this.draft().resourceType,
      page,
      search: this.search(),
      ...(this.draft().resourceType === 'customer' ? { archived: this.archivedCustomers() } : {}),
    });
  }

  /**
   * Method archiveFilter
   * @method archiveFilter
   *
   * @description
   * Requests the selected customer directory scope while retaining the chosen mapping identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native lifecycle choice.
   *
   * @returns {void} No return value.
   */
  protected archiveFilter(value: unknown): void {
    if (this.pending() || this.locked() || (value !== 'active' && value !== 'archived')) return;
    this.archivedCustomers.set(value === 'archived');
    this.searchTargets();
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
    if (
      this.fields().invalid() ||
      this.fields().disabled() ||
      this.mapping().status !== 'success' ||
      !this.allowedTypes().includes(this.draft().resourceType)
    )
      return;
    const draft = this.draft(),
      mapping = this.mapping().data;
    this.submitted.emit({
      resourceType: draft.resourceType,
      resourceId: draft.resourceId,
      system: draft.system.trim(),
      reference: draft.reference.trim(),
      revision: mapping?.revision ?? 0,
    });
  }
  //#endregion
}

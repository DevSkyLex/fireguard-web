import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, type FieldTree } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  FacilityModelInput,
  FacilityModelOutput,
  FacilityModelUploadInput,
  FacilityOption,
} from '@features/organization/features/facilities/models';
import { resolveFacilitySpatialIssueLabel } from '@features/organization/features/facilities/models';
import { FacilityModelSettingsForm } from '@features/organization/features/facilities/ui/forms/facility-model-settings-form';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Class FacilityModelManager
 * @class FacilityModelManager
 *
 * @description
 * Presents autonomous-model import, alignment, association and activation intents to its page.
 */
@Component({
  selector: 'app-facility-model-manager',
  imports: [
    FormField,
    FacilityModelSettingsForm,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmBadge,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmSpinner,
  ],
  templateUrl: './facility-model-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityModelManager {
  //#region Properties
  /**
   * Property models
   * @readonly
   *
   * @description
   * Building's active model and independent replacement draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityModelOutput[]>}
   */
  public readonly models: InputSignal<readonly FacilityModelOutput[]> = input<
    readonly FacilityModelOutput[]
  >([]);

  /**
   * Property selectedModel
   * @readonly
   *
   * @description
   * Immutable model currently previewed.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityModelOutput | null>}
   */
  public readonly selectedModel: InputSignal<FacilityModelOutput | null> =
    input<FacilityModelOutput | null>(null);

  /**
   * Property selectedNodeIndex
   * @readonly
   *
   * @description
   * Selected immutable source index from the scene or list.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number | null>}
   */
  public readonly selectedNodeIndex: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Existing facility choices constrained to this building by the page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly facilityOptions: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Facilities write permission, independent of equipment editing rights.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Any accepted model mutation is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property listPending
   * @readonly
   *
   * @description
   * Initial or retry collection loading state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly listPending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property previewPending
   * @readonly
   *
   * @description
   * Authenticated bytes and parser loading state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly previewPending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property settingsPending
   * @readonly
   *
   * @description
   * Settings-specific submission state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly settingsPending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property settingsSavedToken
   * @readonly
   *
   * @description
   * Confirmed save token used to clear pristine form state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly settingsSavedToken: InputSignal<number> = input<number>(0);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Collection, import, parsing or action refusal.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property settingsError
   * @readonly
   *
   * @description
   * Settings refusal shown beside retained draft fields.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly settingsError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property uploaded
   * @readonly
   *
   * @description
   * New autonomous immutable file selected for upload.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityModelUploadInput>}
   */
  public readonly uploaded: OutputEmitterRef<FacilityModelUploadInput> =
    output<FacilityModelUploadInput>();

  /**
   * Property selected
   * @readonly
   *
   * @description
   * Existing model selected for preview.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();

  /**
   * Property settingsSubmitted
   * @readonly
   *
   * @description
   * Valid complete settings submitted.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityModelInput>}
   */
  public readonly settingsSubmitted: OutputEmitterRef<FacilityModelInput> =
    output<FacilityModelInput>();

  /**
   * Property settingsPreviewed
   * @readonly
   *
   * @description
   * Valid local alignment and association preview.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityModelInput>}
   */
  public readonly settingsPreviewed: OutputEmitterRef<FacilityModelInput> =
    output<FacilityModelInput>();

  /**
   * Property activated
   * @readonly
   *
   * @description
   * Selected model activated after saving the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly activated: OutputEmitterRef<string> = output<string>();

  /**
   * Property removed
   * @readonly
   *
   * @description
   * Model deletion confirmed in an accessible alert dialog.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly removed: OutputEmitterRef<string> = output<string>();

  /**
   * Property downloaded
   * @readonly
   *
   * @description
   * Authenticated native file download requested.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly downloaded: OutputEmitterRef<string> = output<string>();

  /**
   * Property nodeSelected
   * @readonly
   *
   * @description
   * Original source-node index selected through the accessible list.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly nodeSelected: OutputEmitterRef<number> = output<number>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Failed model read retried.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();

  /**
   * Property searchDraft
   * @readonly
   *
   * @description
   * Node search draft, owned by Signal Forms.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{ search: string }>}
   */
  protected readonly searchDraft: WritableSignal<{ search: string }> = signal({ search: '' });

  /**
   * Property searchForm
   * @readonly
   *
   * @description
   * Accessible node-search field.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{ search: string }>}
   */
  protected readonly searchForm: FieldTree<{ search: string }> = form(this.searchDraft);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Keeps previews and immutable-file replacement from silently losing edits.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal(false);

  /**
   * Property fileError
   * @readonly
   *
   * @description
   * Client filename and size refusal before the full binary validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly fileError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property filteredNodes
   * @readonly
   *
   * @description
   * Bounds rendering while preserving search over every indexed source node.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<FacilityModelOutput['nodes']>}
   */
  protected readonly filteredNodes: Signal<FacilityModelOutput['nodes']> = computed(() => {
    const search = this.searchDraft().search.trim().toLocaleLowerCase();
    return (this.selectedModel()?.nodes ?? []).filter(
      (node) =>
        !search ||
        node.name.toLocaleLowerCase().includes(search) ||
        String(node.index).includes(search),
    );
  });

  /**
   * Property visibleNodes
   * @readonly
   *
   * @description
   * One bounded searchable batch of source-node buttons.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<FacilityModelOutput['nodes']>}
   */
  protected readonly visibleNodes: Signal<FacilityModelOutput['nodes']> = computed(() =>
    this.filteredNodes().slice(0, 100),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears transient presentation state only when the owning immutable file changes.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    let previousModelId: string | null = null;
    effect((): void => {
      const modelId = this.selectedModel()?.id ?? null;
      if (modelId === previousModelId) return;
      previousModelId = modelId;
      untracked((): void => {
        this.dirty.set(false);
        this.searchForm().reset({ search: '' });
        this.fileError.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method uploadFile
   * @method uploadFile
   *
   * @description
   * Emits the selected file once, rejecting unsupported extensions and size before reading bytes.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native file-input change.
   *
   * @returns {void}
   */
  protected uploadFile(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    target.value = '';
    this.fileError.set(null);
    if (!file || !this.canWrite() || this.pending() || this.dirty() || this.models().length >= 2)
      return;
    if (!file.name.toLowerCase().endsWith('.glb') || file.size > 10 * 1024 * 1024) {
      this.fileError.set(
        $localize`:@@facility.model.uploadType:Choose an autonomous GLB file no larger than 10 MiB.`,
      );
      return;
    }
    this.uploaded.emit({ file, fileName: file.name });
  }

  /**
   * Method nodeName
   * @method nodeName
   *
   * @description
   * Resolves a source node's display name while keeping its original index visible.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} name - Display-only GLB name.
   *
   * @returns {string} Accessible fallback for unnamed source objects.
   */
  protected nodeName(name: string): string {
    return name || $localize`:@@facility.model.unnamedNode:Unnamed object`;
  }

  /**
   * Method bindingLabel
   * @method bindingLabel
   *
   * @description
   * Shows an existing node association to read-only viewers without using names as identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} index - Immutable source node index.
   *
   * @returns {string} Facility label, or an empty string for unbound objects.
   */
  protected bindingLabel(index: number): string {
    const issue = this.selectedModel()?.bindingIssues.find((item) => item.nodeIndex === index);
    if (issue) return resolveFacilitySpatialIssueLabel(issue.code);
    const id = this.selectedModel()?.bindings.find(
      (binding) => binding.nodeIndex === index,
    )?.facilityId;
    return this.facilityOptions().find((option) => option.value === id)?.label ?? '';
  }

  /**
   * Method bindingIssueLabel
   * @method bindingIssueLabel
   *
   * @description
   * Resolves a safe binding diagnostic through the shared issue registry.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} code - Public diagnostic code.
   *
   * @returns {string} Localized remediation.
   */
  protected bindingIssueLabel(code: string): string {
    return resolveFacilitySpatialIssueLabel(code);
  }
  //#endregion
}

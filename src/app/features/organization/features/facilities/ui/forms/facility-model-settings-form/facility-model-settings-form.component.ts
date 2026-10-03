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
import {
  form,
  FormField,
  validate,
  type FieldTree,
  type ValidationError,
} from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  FacilityModelBinding,
  FacilityModelInput,
  FacilityModelOutput,
  FacilityOption,
} from '@features/organization/features/facilities/models';
import { resolveFacilitySpatialIssueLabel } from '@features/organization/features/facilities/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import type { FacilityModelSettingsDraft } from './models/draft.interface';

/**
 * Class FacilityModelSettingsForm
 * @class FacilityModelSettingsForm
 *
 * @description
 * Edits model alignment and associations without making API calls or discarding failed drafts.
 */
@Component({
  selector: 'app-facility-model-settings-form',
  imports: [FormField, HlmAlertImports, HlmButton, HlmComboboxImports, HlmFieldImports, HlmInput],
  templateUrl: './facility-model-settings-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityModelSettingsForm {
  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Selected immutable model and latest concurrency revision.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityModelOutput>}
   */
  public readonly model: InputSignal<FacilityModelOutput> = input.required<FacilityModelOutput>();

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Existing facilities belonging to this building.
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
   * Property selectedNodeIndex
   * @readonly
   *
   * @description
   * Source index chosen in the scene or accessible node list.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number | null>}
   */
  public readonly selectedNodeIndex: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property savedToken
   * @readonly
   *
   * @description
   * Advances only when the owner confirms a settings write.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly savedToken: InputSignal<number> = input<number>(0);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Prevents duplicate submissions while an accepted write is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Normalized API refusal, preserving the current draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Complete alignment and association intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityModelInput>}
   */
  public readonly submitted: OutputEmitterRef<FacilityModelInput> = output<FacilityModelInput>();

  /**
   * Property previewed
   * @readonly
   *
   * @description
   * Live local settings used for preview before save.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityModelInput>}
   */
  public readonly previewed: OutputEmitterRef<FacilityModelInput> = output<FacilityModelInput>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Signals draft state to the owner before activation or replacement.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable settings, owned by Signal Forms.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<FacilityModelSettingsDraft>}
   */
  protected readonly draft: WritableSignal<FacilityModelSettingsDraft> =
    signal<FacilityModelSettingsDraft>({
      scale: '1',
      rotationDegrees: '0',
      x: '0',
      y: '0',
      z: '0',
      facilityId: '',
      bindings: [],
      removedBindingNodeIndices: [],
    });

  /**
   * Property settingsForm
   * @readonly
   *
   * @description
   * Typed form schema, with finite numeric values and strictly positive scale.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<FacilityModelSettingsDraft>}
   */
  protected readonly settingsForm: FieldTree<FacilityModelSettingsDraft> = form(
    this.draft,
    (path) => {
      for (const field of [path.scale, path.rotationDegrees, path.x, path.y, path.z]) {
        validate(field, ({ value }): ValidationError | null =>
          value().trim() !== '' && Number.isFinite(Number(value()))
            ? null
            : {
                kind: 'finite',
                message: $localize`:@@facility.model.finiteNumber:Enter a finite number.`,
              },
        );
      }
      validate(path.scale, ({ value }): ValidationError | null =>
        Number(value()) > 0
          ? null
          : {
              kind: 'positive',
              message: $localize`:@@facility.model.positiveScale:Enter a scale greater than zero.`,
            },
      );
    },
  );

  /**
   * Property facilityLabelOf
   * @readonly
   *
   * @description
   * Resolves picker values without treating facility names as identifiers.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(id: string) => string}
   */
  protected readonly facilityLabelOf: (id: string) => string = (id) =>
    this.facilityOptions().find((option) => option.value === id)?.label ?? '';

  /**
   * Property selectedNodeName
   * @readonly
   *
   * @description
   * Display name for the selected immutable source node.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly selectedNodeName: Signal<string> = computed(() => {
    const node = this.model().nodes.find((item) => item.index === this.selectedNodeIndex());
    return node ? node.name || $localize`:@@facility.model.unnamedNode:Unnamed object` : '';
  });

  /**
   * Property selectedBindingIssue
   * @readonly
   *
   * @description
   * Explains an unavailable association without exposing the stored target identifier.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly selectedBindingIssue: Signal<string> = computed(() => {
    const issue = this.model().bindingIssues.find(
      (candidate) => candidate.nodeIndex === this.selectedNodeIndex(),
    );
    return issue ? resolveFacilitySpatialIssueLabel(issue.code) : '';
  });

  /**
   * Property seededBindings
   *
   * @description
   * Baseline public associations retained across revision conflicts.
   *
   * @access private
   * @since unreleased
   *
   * @type {readonly FacilityModelBinding[]}
   */
  private seededBindings: readonly FacilityModelBinding[] = [];

  /**
   * Property seededModelId
   *
   * @description
   * Last seeded immutable file identity.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private seededModelId: string | null = null;

  /**
   * Property seededSavedToken
   *
   * @description
   * Last confirmed write token used to reset pristine state.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private seededSavedToken: number = -1;

  /**
   * Property editingNodeIndex
   *
   * @description
   * Node whose current facility field is being edited.
   *
   * @access private
   * @since unreleased
   *
   * @type {number | null}
   */
  private editingNodeIndex: number | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reseeds only for a new immutable file or confirmed save; revision conflicts retain input.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect((): void => {
      const modelId = this.model().id;
      const savedToken = this.savedToken();
      untracked((): void => {
        if (this.seededModelId === modelId && this.seededSavedToken === savedToken) return;
        const model = this.model();
        this.seededModelId = modelId;
        this.seededSavedToken = savedToken;
        this.seededBindings = model.bindings.map(({ nodeIndex, facilityId }) => ({
          nodeIndex,
          facilityId,
        }));
        this.editingNodeIndex = this.selectedNodeIndex();
        this.settingsForm().reset({
          scale: String(model.transform.scale),
          rotationDegrees: String(model.transform.rotationDegrees),
          x: String(model.transform.translation.x),
          y: String(model.transform.translation.y),
          z: String(model.transform.translation.z),
          bindings: model.bindings.map((binding) => ({ ...binding })),
          removedBindingNodeIndices: [],
          facilityId:
            model.bindings.find((binding) => binding.nodeIndex === this.editingNodeIndex)
              ?.facilityId ?? '',
        });
      });
    });
    effect((): void => {
      const index = this.selectedNodeIndex();
      untracked((): void => {
        if (index === this.editingNodeIndex) return;
        this.applyBinding();
        this.editingNodeIndex = index;
        this.draft.update((draft) => ({
          ...draft,
          facilityId:
            draft.bindings.find((binding) => binding.nodeIndex === index)?.facilityId ?? '',
        }));
      });
    });
    effect((): void => {
      const draft = this.draft();
      const invalid = this.settingsForm().invalid();
      const dirty = this.settingsForm().dirty();
      untracked((): void => {
        this.dirtyChanged.emit(dirty);
        if (!invalid) this.previewed.emit(this.inputOf(draft));
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits valid complete settings; failed saves leave all fields unchanged.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submit.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.settingsForm().markAsTouched();
    if (this.pending() || this.settingsForm().invalid()) return;
    this.applyBinding();
    this.submitted.emit(this.inputOf(this.draft()));
  }

  /**
   * Method clearBinding
   * @method clearBinding
   *
   * @description
   * Removes this node's association without affecting other nodes bound to the same facility.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected clearBinding(): void {
    const index = this.editingNodeIndex;
    if (index === null) return;
    this.settingsForm.facilityId().markAsDirty();
    this.draft.update((draft) => ({
      ...draft,
      facilityId: '',
      removedBindingNodeIndices: [...new Set([...draft.removedBindingNodeIndices, index])],
    }));
    this.applyBinding();
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Explicitly restores the latest canonical settings and makes the form pristine.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected discard(): void {
    if (this.pending()) return;
    const model = this.model();
    this.seededBindings = model.bindings.map(({ nodeIndex, facilityId }) => ({
      nodeIndex,
      facilityId,
    }));
    this.settingsForm().reset({
      scale: String(model.transform.scale),
      rotationDegrees: String(model.transform.rotationDegrees),
      x: String(model.transform.translation.x),
      y: String(model.transform.translation.y),
      z: String(model.transform.translation.z),
      bindings: model.bindings.map((binding) => ({ ...binding })),
      removedBindingNodeIndices: [],
      facilityId:
        model.bindings.find((binding) => binding.nodeIndex === this.editingNodeIndex)?.facilityId ??
        '',
    });
  }

  /**
   * Method applyBinding
   * @method applyBinding
   *
   * @description
   * Commits the current node field into the retained association draft.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void}
   */
  private applyBinding(): void {
    const index = this.editingNodeIndex;
    if (index === null) return;
    this.draft.update((draft) => ({
      ...draft,
      bindings: this.bindingsOf(draft, index),
      removedBindingNodeIndices: this.removalsOf(draft, index),
    }));
  }

  /**
   * Method removalsOf
   * @method removalsOf
   *
   * @description
   * Keeps explicit removals separate so clearing the final usable binding preserves masked ones.
   *
   * @access private
   * @since unreleased
   *
   * @param {FacilityModelSettingsDraft} draft - Current settings draft.
   * @param {number} index - Source node being edited.
   *
   * @returns {readonly number[]} Explicitly removed source associations.
   */
  private removalsOf(draft: FacilityModelSettingsDraft, index: number): readonly number[] {
    if (draft.facilityId) return draft.removedBindingNodeIndices.filter((item) => item !== index);
    const previous = draft.bindings.find((binding) => binding.nodeIndex === index);
    return previous
      ? [...new Set([...draft.removedBindingNodeIndices, index])]
      : draft.removedBindingNodeIndices;
  }

  /**
   * Method bindingsOf
   * @method bindingsOf
   *
   * @description
   * Preserves one association per source index, permitting many nodes per facility.
   *
   * @access private
   * @since unreleased
   *
   * @param {FacilityModelSettingsDraft} draft - Retained settings.
   * @param {number} index - Source node being edited.
   *
   * @returns {readonly FacilityModelBinding[]} Complete associations.
   */
  private bindingsOf(
    draft: FacilityModelSettingsDraft,
    index: number,
  ): readonly FacilityModelBinding[] {
    const bindings = draft.bindings
      .filter((binding) => binding.nodeIndex !== index)
      .map(({ nodeIndex, facilityId }) => ({ nodeIndex, facilityId }));
    if (draft.facilityId) {
      bindings.push({ nodeIndex: index, facilityId: draft.facilityId });
    }
    return bindings;
  }

  /**
   * Method inputOf
   * @method inputOf
   *
   * @description
   * Converts valid numeric text to a complete preview or transport payload.
   *
   * @access private
   * @since unreleased
   *
   * @param {FacilityModelSettingsDraft} draft - Retained valid settings.
   *
   * @returns {FacilityModelInput} Complete settings in building metres.
   */
  private inputOf(draft: FacilityModelSettingsDraft): FacilityModelInput {
    const bindings =
      this.editingNodeIndex === null
        ? draft.bindings.map(({ nodeIndex, facilityId }) => ({ nodeIndex, facilityId }))
        : this.bindingsOf(draft, this.editingNodeIndex);
    const removals =
      this.editingNodeIndex === null
        ? draft.removedBindingNodeIndices
        : this.removalsOf(draft, this.editingNodeIndex);
    const bindingsChanged =
      bindings.length !== this.seededBindings.length ||
      bindings.some(
        (binding) =>
          !this.seededBindings.some(
            (seed) =>
              seed.nodeIndex === binding.nodeIndex && seed.facilityId === binding.facilityId,
          ),
      );
    return {
      transform: {
        scale: Number(draft.scale),
        rotationDegrees: Number(draft.rotationDegrees),
        translation: { x: Number(draft.x), y: Number(draft.y), z: Number(draft.z) },
      },
      ...(bindingsChanged && bindings.length > 0 ? { bindings } : {}),
      ...(removals.length > 0 ? { removeBindingNodeIndices: [...removals] } : {}),
    };
  }
  //#endregion
}

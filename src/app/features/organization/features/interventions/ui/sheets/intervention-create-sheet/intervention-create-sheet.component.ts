import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  InterventionDuplicatePrefill,
  InterventionTemplateInstantiateRequest,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { toUtcMidnight } from '@features/organization/features/interventions/utils';
import { serverMessagesOf } from '@shared/form-feedback';

import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { HlmTabsImports } from '@shared/ui/tabs';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '../../forms/intervention-create-form';

import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmItemImports } from '@shared/ui/item';
/**
 * Component InterventionCreateSheet
 * @class InterventionCreateSheet
 *
 * @description
 * The spartan sheet hosting {@link InterventionCreateForm}.
 *
 * Purely presentational: it owns the panel, forwards `visible`/`visibleChange`
 * and re-emits the form's `submitted`; the page keeps the orchestration
 * (`ARCHITECTURE.md` §10.5). Its open state is derived from `visible` rather
 * than held locally, so the page stays the single owner and the two cannot
 * drift.
 *
 * Dismissal is blocked while a creation request is in flight — `disableClose`
 * covers Escape and the backdrop alike. Beyond that, Escape, the backdrop and
 * the form's own Cancel all route through {@link requestClose}: a draft that
 * would be lost raises the shared {@link UnsavedChangesDialog} instead of
 * closing outright. {@link dirty} covers the form *and* the template override
 * drafts, which live on this component rather than in the form — picking a
 * template alone does not count, because that is one click to redo, but a
 * typed or picked override is work.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
 *
 * @version 4.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-sheet',
  imports: [
    ...HlmAvatarImports,
    ...HlmItemImports,
    InterventionCreateForm,
    UnsavedChangesDialog,
    HlmButton,
    HlmInput,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmSheetImports,
    ...HlmTabsImports,
    ...HlmAlertImports,
  ],
  templateUrl: './intervention-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateSheet {
  /** Template selected by the collection menu before opening this sheet. */
  /** Failure of the distinct template instantiation command. */
  public readonly templateServerError: InputSignal<unknown> = input<unknown>(null);

  public readonly initialTemplateId: InputSignal<string | null> = input<string | null>(null);

  /** Only the active mode exposes a form and its submit action; both drafts remain mounted. */
  protected readonly creationMode: WritableSignal<string> = signal<string>('blank');

  /** Recoverable template failure, kept beside the template form. */
  protected readonly templateError: Signal<string | null> = computed(
    () =>
      serverMessagesOf(
        this.templateServerError(),
        [],
        $localize`:@@intervention.cf.createFailed:The intervention could not be created.`,
      )[0] ?? null,
  );
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the panel is open. Owned by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a creation request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the create call failed with, forwarded to the form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property siteOptions
   * @readonly
   *
   * @description
   * The organization's sites.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * The organization's members.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property templates
   * @readonly
   *
   * @description
   * The organization's intervention templates offered by the "start from a
   * template" picker. Empty hides the picker entirely.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {InputSignal<readonly InterventionTemplateOutput[]>}
   */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /**
   * Property instantiating
   * @readonly
   *
   * @description
   * Whether a template instantiation request is in flight.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly instantiating: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property prefill
   * @readonly
   *
   * @description
   * Values to seed the form with, forwarded untouched — the "Duplicate"
   * entry point's payload. Owned by the page: the page is what clears it once
   * this panel closes, the same way {@link selectedTemplateId} clears itself
   * on close, but one level up since this value is not this sheet's own state.
   *
   * @access public
   * @since 6.1.0
   *
   * @type {InputSignal<InterventionDuplicatePrefill | null>}
   */
  public readonly prefill: InputSignal<InterventionDuplicatePrefill | null> =
    input<InterventionDuplicatePrefill | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * The panel wants to open or close.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * The form's validated values, forwarded untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionCreateFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionCreateFormValues> =
    output<InterventionCreateFormValues>();

  /**
   * Property templateInstantiated
   * @readonly
   *
   * @description
   * The operator confirmed a template, carrying its id plus whichever
   * override fields were filled in.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {OutputEmitterRef<InterventionTemplateInstantiateRequest>}
   */
  public readonly templateInstantiated: OutputEmitterRef<InterventionTemplateInstantiateRequest> =
    output<InterventionTemplateInstantiateRequest>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   *
   * @description
   * The panel state, derived from {@link visible} so there is no second copy
   * of the truth.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 6.2.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property selectedTemplateId
   * @readonly
   *
   * @description
   * The template picked in the "start from a template" selector, cleared
   * whenever the panel closes.
   *
   * @access protected
   * @since 4.3.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedTemplateId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** Names a picked template on the closed select trigger. */
  protected readonly templateLabelOf: (value: string) => string = (value: string): string =>
    this.templates().find((template): boolean => template.id === value)?.name ?? '';

  /** Override draft: name. Empty means "use the template default". */
  protected readonly overrideName: WritableSignal<string> = signal<string>('');

  /** Override draft: site (facility IRI), or `null` for "use the template default". */
  protected readonly overrideSite: WritableSignal<string | null> = signal<string | null>(null);

  /** Override draft: responsible (member IRI), or `null` for "use the template default". */
  protected readonly overrideResponsible: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** Override draft: planned start, or `null` for "use the template default". */
  protected readonly overridePlannedStartAt: WritableSignal<Date | null> = signal<Date | null>(
    null,
  );

  /** Names a picked site override on the closed select trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteOptions().find((option: SelectOption): boolean => option.value === value)?.label ?? '';

  /** Names a picked responsible override on the closed select trigger. */
  protected readonly memberLabelOf: (value: string) => string = (value: string): string =>
    this.memberOptions().find((option: MemberSelectOption): boolean => option.value === value)
      ?.label ?? '';

  /**
   * Property formDirty
   * @readonly
   * @description The hosted form's own dirtiness, set from {@link InterventionCreateForm.dirtyChanged}.
   * @access protected
   * @since 7.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly formDirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether closing right now would lose something. The form is only half of
   * it: the template override drafts are this component's own state, and a
   * half-filled override panel disappearing on a backdrop tap is the same
   * loss. A bare template selection is excluded on purpose — re-picking it is
   * one click.
   *
   * @access protected
   * @since 7.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly dirty: Signal<boolean> = computed<boolean>(
    () =>
      this.formDirty() ||
      this.overrideName().trim() !== '' ||
      this.overrideSite() !== null ||
      this.overrideResponsible() !== null ||
      this.overridePlannedStartAt() !== null,
  );

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 7.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   *
   * @description
   * The panel directive itself, queried only so {@link onStateChanged} can
   * call `.open()` — which resolves to `reopen()` on a dialog ref still
   * mid-close — to undo an Escape/outside-click attempt made while
   * {@link dirty}.
   *
   * @access protected
   * @since 7.1.0
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears the picked template and its override drafts whenever the panel
   * closes, so a stale selection never survives to the next time it opens.
   *
   * @access public
   * @since 4.3.0
   */
  public constructor() {
    effect((): void => {
      const templateId: string | null = this.initialTemplateId();
      const visible: boolean = this.visible();
      if (!visible) return;
      untracked((): void => {
        this.selectedTemplateId.set(templateId);
        this.creationMode.set(templateId ? 'template' : 'blank');
      });
    });
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (isVisible) return;

        this.formDirty.set(false);
        this.selectedTemplateId.set(null);
        this.overrideName.set('');
        this.overrideSite.set(null);
        this.overrideResponsible.set(null);
        this.overridePlannedStartAt.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal, ignoring the echo of a change the page already made.
   * An Escape or outside-click attempt reaching here while {@link dirty} is
   * undone through {@link sheetRef} and redirected to the same confirmation
   * {@link requestClose} raises.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * The panel's own close action, reached from the form's Cancel. Closes
   * right away when nothing would be lost; otherwise opens
   * {@link UnsavedChangesDialog} and defers to
   * {@link onUnsavedChangesConfirmed} / {@link onUnsavedChangesDismissed}.
   *
   * @access protected
   * @since 7.1.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel itself.
   * @access protected
   * @since 7.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only, the panel stays open.
   * @access protected
   * @since 7.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }

  /**
   * Method confirmTemplateInstantiate
   * @method confirmTemplateInstantiate
   *
   * @description
   * Emits {@link templateInstantiated} for the picked template plus whichever
   * override drafts were filled in. A no-op without a template selection, so
   * the confirm button never fires on an empty pick. Placeholders on the
   * override fields already communicate that an empty field means "use the
   * template default", so a blank draft is simply omitted rather than sent
   * as an empty string.
   *
   * @access protected
   * @since 4.3.0
   *
   * @returns {void}
   */
  protected confirmTemplateInstantiate(): void {
    const templateId: string | null = this.selectedTemplateId();

    if (!templateId || this.pending() || this.instantiating()) return;

    const name: string = this.overrideName().trim();

    this.templateInstantiated.emit({
      templateId,
      ...(name ? { name } : {}),
      ...(this.overrideSite() ? { site: this.overrideSite() as string } : {}),
      ...(this.overrideResponsible() ? { responsible: this.overrideResponsible() as string } : {}),
      ...(this.overridePlannedStartAt()
        ? { plannedStartAt: toUtcMidnight(this.overridePlannedStartAt() as Date) }
        : {}),
    });
  }
  //#endregion
}

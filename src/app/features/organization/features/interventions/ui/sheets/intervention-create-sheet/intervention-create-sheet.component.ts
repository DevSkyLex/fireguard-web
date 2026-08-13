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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSheetImports } from '@shared/ui/sheet';
import {
  InterventionCreateForm,
  type InterventionCreateFormValues,
} from '../../forms/intervention-create-form';

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
 * covers Escape and the backdrop alike. Cancel always closes: the guard is
 * against losing work by accident, never against leaving deliberately.
 *
 * @version 4.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-create-sheet',
  imports: [InterventionCreateForm, HlmButton, ...HlmSelectImports, ...HlmSheetImports],
  templateUrl: './intervention-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCreateSheet {
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
   * The operator confirmed a template; carries its id.
   *
   * @access public
   * @since 4.3.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly templateInstantiated: OutputEmitterRef<string> = output<string>();
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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears the picked template whenever the panel closes, so a stale
   * selection never survives to the next time it opens.
   *
   * @access public
   * @since 4.3.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (!isVisible) this.selectedTemplateId.set(null);
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

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method confirmTemplateInstantiate
   * @method confirmTemplateInstantiate
   *
   * @description
   * Emits {@link templateInstantiated} for the picked template. A no-op
   * without a selection, so the confirm button never fires on an empty pick.
   *
   * @access protected
   * @since 4.3.0
   *
   * @returns {void}
   */
  protected confirmTemplateInstantiate(): void {
    const templateId: string | null = this.selectedTemplateId();

    if (!templateId) return;

    this.templateInstantiated.emit(templateId);
  }
  //#endregion
}

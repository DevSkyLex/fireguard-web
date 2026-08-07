import type { BooleanInput } from '@angular/cdk/coercion';
import { DatePipe } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin } from '@ng-icons/lucide';
import type {
  InterventionEditState,
  InterventionEditTarget,
  InterventionOutput,
  MemberAvatar,
  UpdateInterventionInput,
} from '@features/organization/features/interventions/models';
import { InplaceField } from '@shared/inplace-field';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmCardImports } from '@shared/ui/card';
import { HlmTextareaImports } from '@shared/ui/textarea';
import { InterventionTag } from '../intervention-tag';

/**
 * Constant DESCRIPTION_MAX_LENGTH
 * @const DESCRIPTION_MAX_LENGTH
 * @description Ceiling the backend enforces on an intervention description.
 * @since 1.0.0
 * @type {number}
 */
const DESCRIPTION_MAX_LENGTH: number = 2000;

/**
 * Component InterventionAbout
 * @class InterventionAbout
 *
 * @description
 * The Overview tab's opening card: what this intervention is (type, site,
 * when it was last touched, who is on it) and its free-text description,
 * edited right here rather than in a sheet that would hide it
 * (`ARCHITECTURE.md` §10.5).
 *
 * Deliberately card-shaped rather than a subtitle line under the page's `h1`
 * — the workspace's header carries only the name and the status, so this is
 * the one place the reference number, type, site and update time actually
 * live.
 *
 * The status tag is absent: it lives in the page header, which is also the
 * one place it doubles as a control.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-about',
  imports: [
    DatePipe,
    NgIcon,
    InplaceField,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmCardImports,
    ...HlmTextareaImports,
  ],
  providers: [provideIcons({ lucideMapPin })],
  templateUrl: './intervention-about.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionAbout {
  //#region Inputs
  /**
   * Property intervention
   * @readonly
   * @description The loaded intervention this card describes.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

  /**
   * Property siteLabel
   * @readonly
   * @description The site's human name, which the page resolves from its IRI.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly siteLabel: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property participants
   * @readonly
   *
   * @description
   * Everyone on the intervention, responsible first, as an overlapping stack.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberAvatar[]>}
   */
  public readonly participants: InputSignal<readonly MemberAvatar[]> = input<
    readonly MemberAvatar[]
  >([]);

  /**
   * Property canEditDetails
   * @readonly
   *
   * @description
   * Whether the description accepts a write — false past a terminal status, and
   * without it the field renders as plain text with no affordance.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canEditDetails: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   *
   * @description
   * Which field the page has open, writing, or showing a rejection — the same
   * state the properties grid reads, which is what keeps one editor open at a
   * time across both surfaces.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionEditState>}
   */
  public readonly editState: InputSignal<InterventionEditState> =
    input.required<InterventionEditState>();
  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   * @description A patch the page should send. Never emitted for an unchanged value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateInterventionInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateInterventionInput> =
    output<UpdateInterventionInput>();

  /**
   * Property editTargetChanged
   * @readonly
   * @description Asks the page to open or close an editor.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<InterventionEditTarget | null> =
    output<InterventionEditTarget | null>();
  //#endregion

  //#region Properties
  /**
   * Property descriptionMaxLength
   * @readonly
   * @description Exposed so the textarea enforces the ceiling natively.
   * @access protected
   * @since 1.0.0
   * @type {number}
   */
  protected readonly descriptionMaxLength: number = DESCRIPTION_MAX_LENGTH;

  /**
   * Property descriptionDraft
   * @readonly
   * @description The in-flight description, seeded when the field opens.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly descriptionDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property canSaveDescription
   * @readonly
   *
   * @description
   * Whether the draft is worth sending. A patch that re-sends the current value
   * would still bump `revision`, which publication is pinned to.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSaveDescription: Signal<boolean> = computed<boolean>(() => {
    const draft: string = this.descriptionDraft().trim();

    return (
      draft.length <= DESCRIPTION_MAX_LENGTH && draft !== (this.intervention().description ?? '')
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method onDescriptionEditing
   *
   * @description
   * Seeds the draft on open and forwards the request to the page, which owns
   * which field is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {boolean} open - Whether the field is being opened.
   *
   * @returns {void}
   */
  protected onDescriptionEditing(open: boolean): void {
    if (open) this.descriptionDraft.set(this.intervention().description ?? '');

    this.editTargetChanged.emit(open ? 'description' : null);
  }

  /**
   * Method saveDescription
   *
   * @description
   * Emits the patch. An empty description is sent as `null` rather than as an
   * empty string, matching what the API stores for "no description".
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected saveDescription(): void {
    const draft: string = this.descriptionDraft().trim();

    this.detailsChanged.emit({ description: draft === '' ? null : draft });
  }
  //#endregion
}

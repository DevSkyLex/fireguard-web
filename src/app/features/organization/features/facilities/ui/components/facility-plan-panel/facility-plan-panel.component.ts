import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideCircleCheck,
  lucidePackage,
  lucideWrench,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type {
  FacilityPlanOverlayEquipment,
  FacilityPlanOverlayZone,
  FacilityType,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import { resolveEquipmentStatusTag } from '@features/organization/features/facilities/models';
import {
  resolveFacilitySpatialIssueLabel,
  resolveFacilityEquipmentPlacementIssueLabel,
} from '@features/organization/features/facilities/models';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { equipmentPlanDetail, equipmentPlanLabel, facilityTypeLabel } from '../../../utils';
import { FacilityPlanItemList, type PlanItemListOption } from '../facility-plan-item-list';
import { FacilityStatusTag } from '../facility-status-tag';

/**
 * Component FacilityPlanPanel
 * @class FacilityPlanPanel
 *
 * @description
 * The 2D Plans tab's browsing/detail side panel — the same role
 * `FacilityBuilding3dRoomPanel` plays in the 3D view, and one of the two
 * consumers `FacilityPlanItemList` was generalized for (see its own
 * `@description`).
 * Always renders `app-facility-plan-item-list` twice — once over every zone
 * on the selected plan, once over {@link equipment} — the accessible
 * equivalent of tapping a zone polygon or an equipment pin on the SVG, since
 * a plain browse-and-pick roster is easier to traverse without a pointer
 * than aiming at a shape. The equipment roster used to be a second,
 * hand-rolled `<button>` loop with an invalid `aria-selected` and no
 * `listbox`/`option` roles; generalizing `FacilityPlanItemList` to carry
 * both rosters gave it the same keyboard model, the same non-colour-only
 * check glyph, and a valid accessible name as the zone list, rather than
 * duplicating the fix. Activating a zone or an equipment pin, from either
 * list or directly on the plan, is reported by the page as
 * {@link selectedZone}/{@link selectedEquipment}: whichever is set renders a
 * **detail** block (name, type for a zone, status through this feature's own
 * registries) that never navigates by itself — the click that selects and
 * the click that leaves the tab are two different actions, so browsing
 * several zones in a row costs nothing.
 * The detail block also carries this tab's editor actions, gated exactly as
 * they were before consolidation: "Edit coordinates" on a selected zone
 * (behind {@link canWrite}), "Edit position" and "Remove from plan" on a
 * selected equipment pin (behind {@link canEditEquipment}). These used to be
 * a second, standing "Zones/Equipment on this plan" management roster
 * beneath the viewer — the same list rendered twice on screen, once here to
 * browse and once there to edit. One list now carries both. The detail
 * block's own close button is {@link focus}'s target: the page moves real
 * focus onto it when a selection opens the block, and restores whatever held
 * focus before once it closes, since the button is removed from the DOM on
 * close and would otherwise drop focus to `body`.
 * When the loaded overlay carries neither a zone nor a pin, the detail area
 * shows the Spartan `hlmEmpty` composition instead, explaining the plan has nothing drawn on
 * it yet — the state this tab had no name for before.
 * Renders as an `hlm-card` at and above `sm`, an `hlm-sheet` (bottom side)
 * beneath it, mirroring `FacilityBuilding3dRoomPanel`'s own breakpoint
 * switch. Unlike that panel's `disableClose` sheet, this one is dismissible
 * (`Escape`, backdrop, swipe) and carries its own visible close button — the
 * toolbar's own "Zones on this plan" opener already reopens a dismissed
 * sheet, so nothing here needs to be the tab's only way back in.
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3). The page owns every store call and dialog open
 * that a detail action here triggers.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-panel',
  imports: [
    RouterLink,
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    ResourceIllustration,
    FacilityPlanItemList,
    FacilityStatusTag,
    HlmButton,
    ...HlmBadgeImports,
    ...HlmCardImports,
    ...HlmSeparatorImports,
    ...HlmSheetImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideBan,
      lucideCircleCheck,
      lucidePackage,
      lucideWrench,
      lucideX,
    }),
  ],
  templateUrl: './facility-plan-panel.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanPanel {
  //#region Inputs
  /**
   * Property zones
   * @readonly
   *
   * @description
   * Every zone on the selected plan, in server order — the browsing list's own catalog.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<FacilityPlanOverlayZone>>}
   */
  public readonly zones: InputSignal<ReadonlyArray<FacilityPlanOverlayZone>> =
    input.required<ReadonlyArray<FacilityPlanOverlayZone>>();

  /**
   * Property selectedZone
   * @readonly
   *
   * @description
   * The currently selected zone, or `null` when a pin is selected or nothing is.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanOverlayZone | null>}
   */
  public readonly selectedZone: InputSignal<FacilityPlanOverlayZone | null> =
    input<FacilityPlanOverlayZone | null>(null);

  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Every equipment pin on the selected plan, in server order — the second roster's own catalog.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<FacilityPlanOverlayEquipment>>}
   */
  public readonly equipment: InputSignal<ReadonlyArray<FacilityPlanOverlayEquipment>> =
    input.required<ReadonlyArray<FacilityPlanOverlayEquipment>>();

  /**
   * Property selectedEquipment
   * @readonly
   *
   * @description
   * The currently selected equipment pin, or `null` when a zone is selected or nothing is.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanOverlayEquipment | null>}
   */
  public readonly selectedEquipment: InputSignal<FacilityPlanOverlayEquipment | null> =
    input<FacilityPlanOverlayEquipment | null>(null);

  /**
   * Property hasNoContent
   * @readonly
   *
   * @description
   * Whether the loaded overlay carries neither a zone nor a pin — gates the "nothing drawn yet"
   * empty state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasNoContent: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property editModeActive
   * @readonly
   *
   * @description
   * Whether a `draw-zone`/`place-pin` mode is currently active — disables the detail block's editor
   * actions so they never fight an in-progress draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly editModeActive: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member may draw/clear a selected zone's outline — gates the detail block's "Edit
   * coordinates" action.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canEditEquipment
   * @readonly
   *
   * @description
   * Whether the member may move or remove a selected equipment pin — gates the detail block's "Edit
   * position"/"Remove from plan" actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property compactVisible
   * @readonly
   *
   * @description
   * Whether the compact-viewport sheet is showing. Ignored on a wide viewport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compactVisible: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization scope for accessible diagnostic record links.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');

  /**
   * Property geometryIssues
   * @readonly
   *
   * @description
   * Retained contour references which are excluded from the rendered overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanOverlayOutput['geometryIssues']>}
   */
  public readonly geometryIssues: InputSignal<FacilityPlanOverlayOutput['geometryIssues']> = input<
    FacilityPlanOverlayOutput['geometryIssues']
  >([]);

  /**
   * Property equipmentIssues
   * @readonly
   *
   * @description
   * Retained equipment references which are excluded from the rendered overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanOverlayOutput['equipmentIssues']>}
   */
  public readonly equipmentIssues: InputSignal<FacilityPlanOverlayOutput['equipmentIssues']> =
    input<FacilityPlanOverlayOutput['equipmentIssues']>([]);
  //#endregion

  //#region Outputs
  /**
   * Property zoneActivated
   * @readonly
   *
   * @description
   * A zone was picked from the zone list — forwarded verbatim, the page resolves it exactly like a
   * plan tap.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly zoneActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property equipmentActivated
   * @readonly
   *
   * @description
   * An equipment pin was picked from the equipment list — forwarded verbatim, the page resolves it
   * exactly like a plan tap.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property zoneClosed
   * @readonly
   *
   * @description
   * The zone detail block's own close control was activated.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly zoneClosed: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentClosed
   * @readonly
   *
   * @description
   * The equipment detail block's own close control was activated.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentClosed: OutputEmitterRef<void> = output<void>();

  /**
   * Property zoneRecordRequested
   * @readonly
   *
   * @description
   * "View facility record" was activated for {@link selectedZone}.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly zoneRecordRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentRecordRequested
   * @readonly
   *
   * @description
   * "View equipment record" was activated for {@link selectedEquipment}.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentRecordRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property zoneEditRequested
   * @readonly
   *
   * @description
   * "Edit coordinates" was activated for {@link selectedZone}.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly zoneEditRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentEditRequested
   * @readonly
   *
   * @description
   * "Edit position" was activated for {@link selectedEquipment}.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentEditRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property equipmentRemoveRequested
   * @readonly
   *
   * @description
   * "Remove from plan" was activated for {@link selectedEquipment}.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly equipmentRemoveRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property compactDismissed
   * @readonly
   *
   * @description
   * The compact sheet was dismissed — by its backdrop, `Escape`, or a swipe.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly compactDismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Selects mobile sheets and touch composition from the central interaction mode, independent of
   * width.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property sheetState
   * @readonly
   *
   * @description
   * The sheet's own open/closed state, derived from {@link compactVisible}.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.compactVisible() ? 'open' : 'closed',
  );

  /**
   * Property panelLabel
   * @readonly
   *
   * @description
   * This panel's accessible landmark name, shared by the card and the sheet content — names what it
   * shows (zones and equipment both), not only the first roster it used to carry alone.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly panelLabel: string = $localize`:@@facility.plans.panel.titleV2:On this plan`;

  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * The zone-detail close button's accessible name.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly closeLabel: string = $localize`:@@facility.plans.panel.close:Close`;

  /**
   * Property zoneRecordLabel
   * @readonly
   *
   * @description
   * "View facility record"'s label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly zoneRecordLabel: string = $localize`:@@facility.plans.panel.viewZoneRecord:View facility record`;

  /**
   * Property equipmentRecordLabel
   * @readonly
   *
   * @description
   * "View equipment record"'s label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly equipmentRecordLabel: string = $localize`:@@facility.plans.panel.viewEquipmentRecord:View equipment record`;

  /**
   * Property zoneEditLabel
   * @readonly
   *
   * @description
   * "Edit coordinates"'s label — reuses the id the removed management roster's own button carried.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly zoneEditLabel: string = $localize`:@@facility.plans.editor.editCoordinates:Edit coordinates`;

  /**
   * Property equipmentEditLabel
   * @readonly
   *
   * @description
   * "Edit position"'s label — reuses the id the removed management roster's own button carried.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly equipmentEditLabel: string = $localize`:@@facility.plans.editor.editPosition:Edit position`;

  /**
   * Property equipmentRemoveLabel
   * @readonly
   *
   * @description
   * "Remove from plan"'s label — reuses the id the removed management roster's own button carried.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly equipmentRemoveLabel: string = $localize`:@@facility.plans.editor.removeFromPlan:Remove from plan`;

  /**
   * Property equipmentListHeading
   * @readonly
   *
   * @description
   * The equipment roster's section heading — reuses the id the removed management roster's own
   * heading carried. Doubles as the roster's `listLabel`.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly equipmentListHeading: string = $localize`:@@facility.plans.editor.equipmentListTitle:Equipment on this plan`;

  /**
   * Property zoneListHeading
   * @readonly
   *
   * @description
   * The zone roster's section heading. Doubles as the roster's `listLabel`.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly zoneListHeading: string = $localize`:@@facility.plans.panel.zoneListHeading:Zones on this plan`;

  /**
   * Property zoneListEmpty
   * @readonly
   *
   * @description
   * The zone roster's empty-state message.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly zoneListEmpty: string = $localize`:@@facility.plans.panel.zoneListEmpty:No zones on this plan.`;

  /**
   * Property equipmentListEmpty
   * @readonly
   *
   * @description
   * The equipment roster's empty-state message — reuses the id the former hand-rolled loop's own
   * `@empty` block carried.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly equipmentListEmpty: string = $localize`:@@facility.plans.panel.equipmentListEmpty:No equipment on this plan yet.`;

  /**
   * Property noContentTitle
   * @readonly
   *
   * @description
   * The "nothing drawn yet" empty state's title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly noContentTitle: string = $localize`:@@facility.plans.panel.noContentTitle:Nothing drawn on this plan yet`;

  /**
   * Property noContentDescription
   * @readonly
   *
   * @description
   * The "nothing drawn yet" empty state's description — the toolbar hint only for a member who can
   * actually draw or place something; a read-only member gets a neutral statement instead.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly noContentDescription: Signal<string> = computed<string>(() =>
    this.canWrite() || this.canEditEquipment()
      ? $localize`:@@facility.plans.panel.noContentDescription:Draw a zone outline or place equipment from the toolbar above to see it here.`
      : $localize`:@@facility.plans.panel.noContentDescriptionReadOnly:Ask a member with edit access to draw a zone outline or place equipment on this plan.`,
  );

  /**
   * Property zoneOptions
   * @readonly
   *
   * @description
   * {@link zones} adapted into `FacilityPlanItemList`'s generic row shape.
   *
   * @access protected
   * @since 1.13.0
   *
   * @type {Signal<ReadonlyArray<PlanItemListOption<FacilityPlanOverlayZone>>>}
   */
  protected readonly zoneOptions: Signal<
    ReadonlyArray<PlanItemListOption<FacilityPlanOverlayZone>>
  > = computed(() =>
    this.zones().map((zone) => ({ id: zone.facilityId, label: zone.name, data: zone })),
  );

  /**
   * Property equipmentOptions
   * @readonly
   *
   * @description
   * {@link equipment} adapted into `FacilityPlanItemList`'s generic row shape.
   *
   * @access protected
   * @since 1.13.0
   *
   * @type {Signal<ReadonlyArray<PlanItemListOption<FacilityPlanOverlayEquipment>>>}
   */
  protected readonly equipmentOptions: Signal<
    ReadonlyArray<PlanItemListOption<FacilityPlanOverlayEquipment>>
  > = computed(() =>
    this.equipment().map((pin) => ({
      id: pin.equipmentId,
      label: this.equipmentLabel(pin),
      data: pin,
    })),
  );

  /**
   * Property closeButtonRef
   * @readonly
   *
   * @description
   * The rendered detail block's own close button — {@link focus}'s target, present only once
   * {@link selectedZone} or {@link selectedEquipment} is non-`null`.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly closeButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  //#endregion

  //#region Methods
  /**
   * Method typeLabel
   *
   * @description
   * Resolves a zone's raw {@link FacilityType} into its localized label, from the same catalog the
   * create form's type picker already draws from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityType} type - The zone's facility type.
   *
   * @returns {string} Its localized label, or a localized "Unknown type" fallback.
   */
  protected typeLabel(type: FacilityType): string {
    return facilityTypeLabel(type);
  }

  /**
   * Method equipmentLabel
   *
   * @description
   * Names a selected equipment pin the way an operator would — its location when recorded, else its
   * translated type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   *
   * @returns {string} The pin's display label.
   */
  protected equipmentLabel(pin: FacilityPlanOverlayEquipment): string {
    return equipmentPlanLabel(pin);
  }

  /**
   * Method equipmentDetail
   *
   * @description
   * The secondary line under {@link equipmentLabel} — type and serial, or nothing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   *
   * @returns {string} The pin's secondary line, or an empty string.
   */
  protected equipmentDetail(pin: FacilityPlanOverlayEquipment): string {
    return equipmentPlanDetail(pin);
  }

  /**
   * Method equipmentStatusLabel
   *
   * @description
   * Resolves a selected pin's status into its localized presentation label — never the raw enum.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   *
   * @returns {string} The status's localized label.
   */
  protected equipmentStatusLabel(pin: FacilityPlanOverlayEquipment): string {
    return resolveEquipmentStatusTag(pin.status).label;
  }

  /**
   * Method equipmentStatusIcon
   *
   * @description
   * Resolves a selected pin's status into its registered `@ng-icons/lucide` name — paired with
   * {@link equipmentStatusLabel} so the status never carries by colour alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   *
   * @returns {string} The status's icon name.
   */
  protected equipmentStatusIcon(pin: FacilityPlanOverlayEquipment): string {
    return resolveEquipmentStatusTag(pin.status).icon;
  }

  /**
   * Method onSheetStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this state is derived from. Guarded
   * against echoing a state the page already holds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onSheetStateChanged(state: BrnDialogState): void {
    if (state === 'open' || !this.compactVisible()) return;

    this.compactDismissed.emit();
  }

  /**
   * Method focus
   *
   * @description
   * Moves real DOM focus onto the detail block's own close button. A no-op while nothing is
   * selected — the page only calls this on the selection's opening edge, when that button is
   * guaranteed to have just rendered.
   *
   * @access public
   * @since 1.13.0
   *
   * @returns {void}
   */
  public focus(): void {
    this.closeButtonRef()?.nativeElement.focus();
  }

  /**
   * Method geometryIssueLabel
   *
   * @description
   * Resolves a contour diagnostic without displaying raw API enum values.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} code - Public contour issue.
   *
   * @returns {string} Localized contour explanation.
   */
  protected geometryIssueLabel(code: string): string {
    return resolveFacilitySpatialIssueLabel(code);
  }

  /**
   * Method equipmentIssueLabel
   *
   * @description
   * Resolves a placement diagnostic without inventing a position on the selected plan.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityPlanOverlayOutput['equipmentIssues'][number]['code']} code - Public placement
   *   issue.
   *
   * @returns {string} Localized equipment explanation.
   */
  protected equipmentIssueLabel(
    code: FacilityPlanOverlayOutput['equipmentIssues'][number]['code'],
  ): string {
    return resolveFacilityEquipmentPlacementIssueLabel(code);
  }
  //#endregion
}

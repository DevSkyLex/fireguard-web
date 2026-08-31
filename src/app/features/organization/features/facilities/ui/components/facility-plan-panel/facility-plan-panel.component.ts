import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideCircleCheck,
  lucidePackage,
  lucideShapes,
  lucideWrench,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  FacilityPlanOverlayEquipment,
  FacilityPlanOverlayZone,
  FacilityType,
} from '@features/organization/features/facilities/models';
import { resolveEquipmentStatusTag } from '@features/organization/features/facilities/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/features/facilities/options';
import { isCompact } from '@shared/breakpoint';
import { EmptyState } from '@shared/empty-state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSheetImports } from '@shared/ui/sheet';
import { equipmentPlanDetail, equipmentPlanLabel } from '../../../utils';
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
 *
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
 *
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
 *
 * When the loaded overlay carries neither a zone nor a pin, the detail area
 * shows `app-empty-state` instead, explaining the plan has nothing drawn on
 * it yet — the state this tab had no name for before.
 *
 * Renders as an `hlm-card` at and above `sm`, an `hlm-sheet` (bottom side)
 * beneath it, mirroring `FacilityBuilding3dRoomPanel`'s own breakpoint
 * switch. Unlike that panel's `disableClose` sheet, this one is dismissible
 * (`Escape`, backdrop, swipe) and carries its own visible close button — the
 * toolbar's own "Zones on this plan" opener already reopens a dismissed
 * sheet, so nothing here needs to be the tab's only way back in.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3). The page owns every store call and dialog open
 * that a detail action here triggers.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-panel',
  imports: [
    NgTemplateOutlet,
    NgIcon,
    EmptyState,
    FacilityPlanItemList,
    FacilityStatusTag,
    HlmButton,
    ...HlmCardImports,
    ...HlmSheetImports,
  ],
  providers: [
    provideIcons({
      lucideBan,
      lucideCircleCheck,
      lucidePackage,
      lucideShapes,
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
  /** Every zone on the selected plan, in server order — the browsing list's own catalog. */
  public readonly zones: InputSignal<ReadonlyArray<FacilityPlanOverlayZone>> =
    input.required<ReadonlyArray<FacilityPlanOverlayZone>>();

  /** The currently selected zone, or `null` when a pin is selected or nothing is. */
  public readonly selectedZone: InputSignal<FacilityPlanOverlayZone | null> =
    input<FacilityPlanOverlayZone | null>(null);

  /** Every equipment pin on the selected plan, in server order — the second roster's own catalog. */
  public readonly equipment: InputSignal<ReadonlyArray<FacilityPlanOverlayEquipment>> =
    input.required<ReadonlyArray<FacilityPlanOverlayEquipment>>();

  /** The currently selected equipment pin, or `null` when a zone is selected or nothing is. */
  public readonly selectedEquipment: InputSignal<FacilityPlanOverlayEquipment | null> =
    input<FacilityPlanOverlayEquipment | null>(null);

  /** Whether the loaded overlay carries neither a zone nor a pin — gates the "nothing drawn yet" empty state. */
  public readonly hasNoContent: InputSignal<boolean> = input<boolean>(false);

  /** Whether a `draw-zone`/`place-pin` mode is currently active — disables the detail block's editor actions so they never fight an in-progress draft. */
  public readonly editModeActive: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may draw/clear a selected zone's outline — gates the detail block's "Edit coordinates" action. */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may move or remove a selected equipment pin — gates the detail block's "Edit position"/"Remove from plan" actions. */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);

  /** Whether the compact-viewport sheet is showing. Ignored on a wide viewport. */
  public readonly compactVisible: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Outputs
  /** A zone was picked from the zone list — forwarded verbatim, the page resolves it exactly like a plan tap. */
  public readonly zoneActivated: OutputEmitterRef<string> = output<string>();

  /** An equipment pin was picked from the equipment list — forwarded verbatim, the page resolves it exactly like a plan tap. */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();

  /** The zone detail block's own close control was activated. */
  public readonly zoneClosed: OutputEmitterRef<void> = output<void>();

  /** The equipment detail block's own close control was activated. */
  public readonly equipmentClosed: OutputEmitterRef<void> = output<void>();

  /** "View facility record" was activated for {@link selectedZone}. */
  public readonly zoneRecordRequested: OutputEmitterRef<void> = output<void>();

  /** "View equipment record" was activated for {@link selectedEquipment}. */
  public readonly equipmentRecordRequested: OutputEmitterRef<void> = output<void>();

  /** "Edit coordinates" was activated for {@link selectedZone}. */
  public readonly zoneEditRequested: OutputEmitterRef<void> = output<void>();

  /** "Edit position" was activated for {@link selectedEquipment}. */
  public readonly equipmentEditRequested: OutputEmitterRef<void> = output<void>();

  /** "Remove from plan" was activated for {@link selectedEquipment}. */
  public readonly equipmentRemoveRequested: OutputEmitterRef<void> = output<void>();

  /** The compact sheet was dismissed — by its backdrop, `Escape`, or a swipe. */
  public readonly compactDismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Whether the viewport is narrow enough to render the `hlm-sheet` branch instead of the `hlm-card` one. */
  protected readonly isCompact: Signal<boolean> = isCompact();

  /** The sheet's own open/closed state, derived from {@link compactVisible}. */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.compactVisible() ? 'open' : 'closed',
  );

  /** This panel's accessible landmark name, shared by the card and the sheet content. */
  protected readonly panelLabel: string = $localize`:@@facility.plans.panel.title:Plan zones`;

  /** The zone-detail close button's accessible name. */
  protected readonly closeLabel: string = $localize`:@@facility.plans.panel.close:Close`;

  /** "View facility record"'s label. */
  protected readonly zoneRecordLabel: string = $localize`:@@facility.plans.panel.viewZoneRecord:View facility record`;

  /** "View equipment record"'s label. */
  protected readonly equipmentRecordLabel: string = $localize`:@@facility.plans.panel.viewEquipmentRecord:View equipment record`;

  /** "Edit coordinates"'s label — reuses the id the removed management roster's own button carried. */
  protected readonly zoneEditLabel: string = $localize`:@@facility.plans.editor.editCoordinates:Edit coordinates`;

  /** "Edit position"'s label — reuses the id the removed management roster's own button carried. */
  protected readonly equipmentEditLabel: string = $localize`:@@facility.plans.editor.editPosition:Edit position`;

  /** "Remove from plan"'s label — reuses the id the removed management roster's own button carried. */
  protected readonly equipmentRemoveLabel: string = $localize`:@@facility.plans.editor.removeFromPlan:Remove from plan`;

  /** The equipment roster's section heading — reuses the id the removed management roster's own heading carried. Doubles as the roster's `listLabel`. */
  protected readonly equipmentListHeading: string = $localize`:@@facility.plans.editor.equipmentListTitle:Equipment on this plan`;

  /** The zone roster's section heading. Doubles as the roster's `listLabel`. */
  protected readonly zoneListHeading: string = $localize`:@@facility.plans.panel.zoneListHeading:Zones on this plan`;

  /** The zone roster's empty-state message. */
  protected readonly zoneListEmpty: string = $localize`:@@facility.plans.panel.zoneListEmpty:No zones on this plan.`;

  /** The equipment roster's empty-state message — reuses the id the former hand-rolled loop's own `@empty` block carried. */
  protected readonly equipmentListEmpty: string = $localize`:@@facility.plans.panel.equipmentListEmpty:No equipment on this plan yet.`;

  /** The "nothing drawn yet" empty state's title. */
  protected readonly noContentTitle: string = $localize`:@@facility.plans.panel.noContentTitle:Nothing drawn on this plan yet`;

  /** The "nothing drawn yet" empty state's description. */
  protected readonly noContentDescription: string = $localize`:@@facility.plans.panel.noContentDescription:Draw a zone outline or place equipment from the toolbar above to see it here.`;

  /**
   * Property zoneOptions
   * @readonly
   * @description {@link zones} adapted into `FacilityPlanItemList`'s generic row shape.
   * @access protected
   * @since 1.13.0
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
   * @description {@link equipment} adapted into `FacilityPlanItemList`'s generic row shape.
   * @access protected
   * @since 1.13.0
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

  /** The rendered detail block's own close button — {@link focus}'s target, present only once {@link selectedZone} or {@link selectedEquipment} is non-`null`. */
  private readonly closeButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  //#endregion

  //#region Methods
  /**
   * Method typeLabel
   * @description Resolves a zone's raw {@link FacilityType} into its localized label, from the same catalog the create form's type picker already draws from.
   * @access protected
   * @since 1.0.0
   * @param {FacilityType} type - The zone's facility type.
   * @returns {string} Its localized label, or the raw value when it matches no known type.
   */
  protected typeLabel(type: FacilityType): string {
    return FACILITY_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
  }

  /**
   * Method equipmentLabel
   * @description Names a selected equipment pin the way an operator would — its location when recorded, else its translated type.
   * @access protected
   * @since 1.0.0
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   * @returns {string} The pin's display label.
   */
  protected equipmentLabel(pin: FacilityPlanOverlayEquipment): string {
    return equipmentPlanLabel(pin);
  }

  /**
   * Method equipmentDetail
   * @description The secondary line under {@link equipmentLabel} — type and serial, or nothing.
   * @access protected
   * @since 1.0.0
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   * @returns {string} The pin's secondary line, or an empty string.
   */
  protected equipmentDetail(pin: FacilityPlanOverlayEquipment): string {
    return equipmentPlanDetail(pin);
  }

  /**
   * Method equipmentStatusLabel
   * @description Resolves a selected pin's status into its localized presentation label — never the raw enum.
   * @access protected
   * @since 1.0.0
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   * @returns {string} The status's localized label.
   */
  protected equipmentStatusLabel(pin: FacilityPlanOverlayEquipment): string {
    return resolveEquipmentStatusTag(pin.status).label;
  }

  /**
   * Method equipmentStatusIcon
   * @description Resolves a selected pin's status into its registered `@ng-icons/lucide` name — paired with {@link equipmentStatusLabel} so the status never carries by colour alone.
   * @access protected
   * @since 1.0.0
   * @param {FacilityPlanOverlayEquipment} pin - The selected pin.
   * @returns {string} The status's icon name.
   */
  protected equipmentStatusIcon(pin: FacilityPlanOverlayEquipment): string {
    return resolveEquipmentStatusTag(pin.status).icon;
  }

  /**
   * Method onSheetStateChanged
   * @description Reports a dismissal back to the page, which owns the flag this state is derived from. Guarded against echoing a state the page already holds.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onSheetStateChanged(state: BrnDialogState): void {
    if (state === 'open' || !this.compactVisible()) return;

    this.compactDismissed.emit();
  }

  /**
   * Method focus
   * @description Moves real DOM focus onto the detail block's own close button. A no-op while nothing is selected — the page only calls this on the selection's opening edge, when that button is guaranteed to have just rendered.
   * @access public
   * @since 1.13.0
   * @returns {void}
   */
  public focus(): void {
    this.closeButtonRef()?.nativeElement.focus();
  }
  //#endregion
}

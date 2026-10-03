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
import { lucideMap, lucideX } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { resolveEquipmentStatusTag } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import type { FacilityBuildingModelEquipment } from '@features/organization/features/facilities/models';
import {
  resolveFacilitySpatialIssueLabel,
  resolveFacilityEquipmentPlacementIssueLabel,
  resolveFacilityHierarchyIssueLabel,
} from '@features/organization/features/facilities/models';
import type {
  FacilityBuildingModelFloor,
  FacilityPlanOverlayZone,
  FacilityType,
  FacilityOption,
} from '@features/organization/features/facilities/models';
import { isMetricFacilityFloor } from '@features/organization/features/facilities/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { facilityTypeLabel } from '../../../utils';
import { FacilityPlanItemList, type PlanItemListOption } from '../facility-plan-item-list';
import { FacilityStatusTag } from '../facility-status-tag';
/**
 * Component FacilityBuilding3dRoomPanel
 * @class FacilityBuilding3dRoomPanel
 *
 * @description
 * The 3D building view's keyboard-reachable browsing surface. Mounted by
 * the owning page as soon as a floor is selected — never gated on a room,
 * which would leave a keyboard/screen-reader user with no entry path at
 * all, since a room can only be selected today through the canvas' own
 * pointer-only `roomActivated` (`FacilityBuilding3dPage` selects the
 * model's first floor by default on load precisely so this panel — and
 * therefore `app-facility-building-3d-room-list` — is always reachable,
 * with no prior pointer interaction required).
 * Always renders: a floor selector (`hlm-toggle-group`, single-select, one
 * item per {@link floors} carrying its own room count) and
 * `app-facility-plan-item-list` for that floor's rooms — the actual
 * accessible equivalent of the canvas' pointer browsing, its status
 * decorator projected through `app-facility-status-tag`.
 * `FacilityPlanItemList` was generalized from this component's own former
 * private `facility-building-3d-room-list` once the 2D Plans tab's own
 * panel needed the identical roving-tabindex list over the same
 * `FacilityPlanOverlayZone` type, then again over its equipment pins — see
 * its own `@description` and this feature's `FEATURE.md`. The room *detail*
 * block (name, type, status through the feature's own `facility-status-tag`
 * registry, a "View on 2D plan" action, and its own close control) renders
 * only once {@link room} is non-`null`; closing it deselects the room
 * ({@link roomClosed}) without touching the floor selection, so this
 * surface itself never disappears.
 * Renders as an `hlm-card` at and above `sm`, an `hlm-sheet` (bottom side,
 * `disableClose`) beneath it, switching on `@shared/breakpoint`'s own
 * `isMobileInteractionMode`. `disableClose` keeps the sheet from being dismissed by
 * `Escape`, a backdrop click or a swipe: were it closable, dismissing it
 * would remove this feature's only keyboard-reachable surface with no way
 * back except a pointer tap on the canvas — exactly the trap this
 * component exists to avoid. Presentational (`ARCHITECTURE.md` §10.3): the
 * page owns the store call every output here triggers, and owns moving
 * focus into and out of the room-detail block — {@link focus} only exposes
 * the DOM target for that, it decides nothing about when.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-room-panel',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    FacilityPlanItemList,
    FacilityStatusTag,
    HlmButton,
    ...HlmCardImports,
    ...HlmSeparatorImports,
    ...HlmSheetImports,
    ...HlmToggleGroupImports,
    ...HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideMap, lucideX })],
  templateUrl: './facility-building-3d-room-panel.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dRoomPanel {
  //#region Inputs
  /**
   * Property floors
   * @readonly
   *
   * @description
   * Every floor of the building, in server order — the floor selector's own catalog.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<FacilityBuildingModelFloor>>}
   */
  public readonly floors: InputSignal<ReadonlyArray<FacilityBuildingModelFloor>> =
    input.required<ReadonlyArray<FacilityBuildingModelFloor>>();
  /**
   * Property selectedFloorId
   * @readonly
   *
   * @description
   * The currently selected floor's facility id — always set while this panel is mounted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly selectedFloorId: InputSignal<string> = input.required<string>();
  /**
   * Property room
   * @readonly
   *
   * @description
   * The selected room, or `null` while only a floor is selected — gates the detail block.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityPlanOverlayZone | null>}
   */
  public readonly room: InputSignal<FacilityPlanOverlayZone | null> =
    input<FacilityPlanOverlayZone | null>(null);
  /**
   * Property compactVisible
   * @readonly
   *
   * @description
   * Whether the compact-viewport sheet is open. Ignored on a wide viewport,
   * where the panel is a card that is simply always there.
   * The page owns this rather than the panel, because the toolbar control that
   * reopens a dismissed sheet lives there — and because a sheet that cannot be
   * dismissed would cover most of a small screen with no way back to the very
   * building it describes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compactVisible: InputSignal<boolean> = input<boolean>(true);
  /**
   * Property equipment
   * @readonly
   *
   * @description
   * Selected equipment detail, independent from room selection.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityBuildingModelEquipment | null>}
   */
  public readonly equipment: InputSignal<FacilityBuildingModelEquipment | null> =
    input<FacilityBuildingModelEquipment | null>(null);
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Builds the canonical equipment record link within this organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input('');
  /**
   * Property metric
   * @readonly
   *
   * @description
   * Explains which floors are omitted by the metric rendering.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly metric: InputSignal<boolean> = input(false);

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * Accessible descendant names for contours excluded from the usable projection.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly facilityOptions: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);
  //#endregion
  //#region Outputs
  /**
   * Property floorActivated
   * @readonly
   *
   * @description
   * A different floor was picked from the floor selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly floorActivated: OutputEmitterRef<string> = output<string>();
  /**
   * Property roomActivated
   * @readonly
   *
   * @description
   * A room was picked from the room list — forwarded verbatim, the page resolves it the same way as
   * the scene's own `roomActivated`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly roomActivated: OutputEmitterRef<string> = output<string>();
  /**
   * Property roomClosed
   * @readonly
   *
   * @description
   * The room detail block's own close control was activated — the page deselects the room, leaving
   * the floor selection (and this panel) untouched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly roomClosed: OutputEmitterRef<void> = output<void>();
  /**
   * Property plan2dRequested
   * @readonly
   *
   * @description
   * "View on 2D plan" was activated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly plan2dRequested: OutputEmitterRef<void> = output<void>();
  /**
   * Property compactDismissed
   * @readonly
   *
   * @description
   * The compact sheet was dismissed — by its backdrop, by Escape, or by a swipe. The page owns the
   * flag and reopens it from the toolbar.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly compactDismissed: OutputEmitterRef<void> = output<void>();
  /**
   * Property equipmentActivated
   * @readonly
   *
   * @description
   * Selects any equipment, including ones with unavailable placement.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();
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
   * Property selectedFloor
   * @readonly
   *
   * @description
   * {@link selectedFloorId} resolved against {@link floors} — `null` only if the id matches nothing,
   * which never happens in practice.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<FacilityBuildingModelFloor | null>}
   */
  protected readonly selectedFloor: Signal<FacilityBuildingModelFloor | null> =
    computed<FacilityBuildingModelFloor | null>(
      () => this.floors().find((floor) => floor.facilityId === this.selectedFloorId()) ?? null,
    );
  /**
   * Property floorRooms
   * @readonly
   *
   * @description
   * The selected floor's rooms — the room list's own input.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<FacilityPlanOverlayZone>>}
   */
  protected readonly floorRooms: Signal<ReadonlyArray<FacilityPlanOverlayZone>> = computed<
    ReadonlyArray<FacilityPlanOverlayZone>
  >(() => this.selectedFloor()?.rooms ?? []);
  /**
   * Property roomOptions
   * @readonly
   *
   * @description
   * {@link floorRooms} adapted into `FacilityPlanItemList`'s generic row shape.
   *
   * @access protected
   * @since 1.13.0
   *
   * @type {Signal<ReadonlyArray<PlanItemListOption<FacilityPlanOverlayZone>>>}
   */
  protected readonly roomOptions: Signal<
    ReadonlyArray<PlanItemListOption<FacilityPlanOverlayZone>>
  > = computed(() =>
    this.floorRooms().map((room) => ({ id: room.facilityId, label: room.name, data: room })),
  );
  /**
   * Property closeButtonRef
   * @readonly
   *
   * @description
   * The rendered room-detail close button — {@link focus}'s target, present only once {@link room} is
   * non-`null`.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly closeButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  /**
   * Property panelLabel
   * @readonly
   *
   * @description
   * This panel's accessible landmark name, shared by the card and the sheet content.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly panelLabel: string = $localize`:@@facility.building3d.roomPanel.title:Building rooms`;
  /**
   * Property floorSelectorLabel
   * @readonly
   *
   * @description
   * The floor selector's accessible name.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly floorSelectorLabel: string = $localize`:@@facility.building3d.roomPanel.floorSelectorLabel:Floors`;
  /**
   * Property closeLabel
   * @readonly
   *
   * @description
   * The room-detail close button's accessible name.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly closeLabel: string = $localize`:@@facility.building3d.roomPanel.close:Close`;
  /**
   * Property plan2dLabel
   * @readonly
   *
   * @description
   * The "View on 2D plan" action's label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly plan2dLabel: string = $localize`:@@facility.building3d.roomPanel.plan2dAction:View on 2D plan`;
  /**
   * Property roomListLabel
   * @readonly
   *
   * @description
   * The room list's accessible name — reuses an id left orphaned by the earlier `FacilityZoneList`
   * extraction.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly roomListLabel: string = $localize`:@@facility.building3d.roomPanel.roomListLabel:Rooms on this floor`;
  /**
   * Property roomListEmpty
   * @readonly
   *
   * @description
   * The room list's empty-state message — same reused id as {@link roomListLabel}.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly roomListEmpty: string = $localize`:@@facility.building3d.roomPanel.roomListEmpty:This floor has no rooms yet.`;
  /**
   * Property floorEquipment
   * @readonly
   *
   * @description
   * Preserves every equipment assigned to the selected floor's subtree.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<FacilityBuildingModelEquipment>>}
   */
  protected readonly floorEquipment: Signal<ReadonlyArray<FacilityBuildingModelEquipment>> =
    computed(() => this.selectedFloor()?.equipment ?? []);
  //#endregion
  //#region Methods
  /**
   * Method typeLabel
   *
   * @description
   * Resolves a room's raw {@link FacilityType} into its localized label, from the same catalog the
   * create form's type picker already draws from — never a second lookup table for the same closed
   * set.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityType} type - The room's facility type.
   *
   * @returns {string} Its localized label, or a localized "Unknown type" fallback.
   */
  protected typeLabel(type: FacilityType): string {
    return facilityTypeLabel(type);
  }
  /**
   * Method onFloorPicked
   *
   * @description
   * Narrows `hlm-toggle-group`'s single-select payload and re-emits {@link floorActivated} — a no-op
   * if the group somehow reports no value.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's new value.
   *
   * @returns {void}
   */
  protected onFloorPicked(value: string | readonly string[] | null | undefined): void {
    if (typeof value !== 'string') return;
    this.floorActivated.emit(value);
  }
  /**
   * Method focus
   *
   * @description
   * Moves real DOM focus onto the room-detail block's own close button. A no-op while no room is
   * selected — the page only calls this on the room-selection opening edge, when that button is
   * guaranteed to have just rendered.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public focus(): void {
    this.closeButtonRef()?.nativeElement.focus();
  }
  /**
   * Method equipmentTitle
   *
   * @description
   * Formats the catalog type and available identifying label.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityBuildingModelEquipment} equipment - Equipment projection.
   *
   * @returns {string} Localized equipment label.
   */
  protected equipmentTitle(equipment: FacilityBuildingModelEquipment): string {
    const type =
      EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipment.type)?.label ??
      $localize`:@@facility.building3d.equipment:Equipment`;
    return equipment.serialNumber ? `${type} · ${equipment.serialNumber}` : type;
  }
  /**
   * Method equipmentStatus
   *
   * @description
   * Reuses the public equipment status catalog.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} status - Business equipment status.
   *
   * @returns {string} Localized lifecycle label.
   */
  protected equipmentStatus(status: string): string {
    return resolveEquipmentStatusTag('status', status).label;
  }
  /**
   * Method placementLabel
   *
   * @description
   * Explains unavailable source placements without assigning fallback coordinates.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityBuildingModelEquipment} equipment - Equipment projection.
   *
   * @returns {string} Placement explanation, or an empty string for usable placements.
   */
  protected placementLabel(equipment: FacilityBuildingModelEquipment): string {
    if (equipment.placementIssue)
      return resolveFacilityEquipmentPlacementIssueLabel(equipment.placementIssue);
    const calibrationIssue = this.selectedFloor()?.plan?.calibrationIssue;
    if (this.metric() && calibrationIssue)
      return resolveFacilitySpatialIssueLabel(calibrationIssue);
    return this.metric() && this.incomplete(this.selectedFloor())
      ? $localize`:@@facility.building3d.placement.uncalibrated:Floor calibration incomplete`
      : '';
  }
  /**
   * Method incomplete
   *
   * @description
   * Flags floors missing physical calibration or vertical dimensions.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityBuildingModelFloor | null} floor - Floor to check.
   *
   * @returns {boolean} Whether metric rendering cannot faithfully place this floor.
   */
  protected incomplete(floor: FacilityBuildingModelFloor | null): boolean {
    return !isMetricFacilityFloor(floor);
  }

  /**
   * Method spatialIssueLabel
   *
   * @description
   * Resolves retained geometry and plan diagnostics through the feature registry.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} code - Public issue code.
   *
   * @returns {string} Localized explanation.
   */
  protected spatialIssueLabel(code: string): string {
    return resolveFacilitySpatialIssueLabel(code);
  }

  /**
   * Method hierarchyIssueLabel
   *
   * @description
   * Explains legacy floor ancestry while retaining all accessible floor browsing paths.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} code - Public structural diagnostic code.
   *
   * @returns {string} Localized corrective explanation.
   */
  protected hierarchyIssueLabel(code: string): string {
    return resolveFacilityHierarchyIssueLabel(code);
  }

  /**
   * Method diagnosticFacilityLabel
   *
   * @description
   * Identifies a safe diagnostic target even when its unusable contour is absent from the scene.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} id - Accessible facility identifier.
   *
   * @returns {string} Known facility label or a distinct localized fallback.
   */
  protected diagnosticFacilityLabel(id: string): string {
    return (
      this.facilityOptions().find((option) => option.value === id)?.label ??
      this.floors().find((floor) => floor.facilityId === id)?.name ??
      $localize`:@@facility.spatial.facilityLabel:Facility ${id}:facilityId:`
    );
  }
  /**
   * Method outlineLabel
   *
   * @description
   * Distinguishes explicit contours, estimated bounds and missing geometry.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityBuildingModelFloor | null} floor - Floor to describe.
   *
   * @returns {string} Localized source description.
   */
  protected outlineLabel(floor: FacilityBuildingModelFloor | null): string {
    if (!floor?.outline) return $localize`:@@facility.building3d.outline.missing:Missing outline`;
    return floor.outline.source === 'plan_geometry'
      ? $localize`:@@facility.building3d.outline.drawn:Drawn outline`
      : $localize`:@@facility.building3d.outline.estimated:Estimated outline`;
  }
  //#endregion
  /**
   * Method onSheetStateChanged
   * @method onSheetStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this state is
   * derived from. Guarded against echoing a state the page already holds.
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
}

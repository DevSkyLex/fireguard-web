import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBoxes, lucideList } from '@ng-icons/lucide';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { FacilityPlanEditMode } from '@features/organization/features/facilities/state';
import { HlmButton } from '@shared/ui/button';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSwitch } from '@shared/ui/switch';
import { equipmentPlanLabel } from '../../../utils';

/**
 * Component FacilityPlanToolbar
 * @class FacilityPlanToolbar
 *
 * @description
 * The Plans tab's single toolbar, grouping what used to be spread across
 * three stacked blocks — an isolated "3D view" link, the zone/equipment
 * layer switches, and the editor picker/status bar — into one bar, laid out
 * like `FacilityBuilding3dPage`'s own toolbar: one `flex-wrap` group on the
 * left (layer switches, the compact panel opener), one on the right (the 3D
 * link, the `draw-zone`/`place-pin` pickers and their in-mode controls).
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3). The page owns every store write a control here
 * triggers, including the pickers' `null`-clearing selection events — this
 * component only forwards a genuinely picked id.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-toolbar',
  imports: [RouterLink, NgIcon, HlmButton, HlmSwitch, ...HlmSelectImports],
  providers: [provideIcons({ lucideBoxes, lucideList })],
  templateUrl: './facility-plan-toolbar.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanToolbar {
  //#region Inputs
  /** Whether the facility is a `building` — the "3D view" link only ever makes sense there. */
  public readonly is3dLinkVisible: InputSignal<boolean> = input<boolean>(false);

  /** Where the "3D view" link points. */
  public readonly plan3dRoute: InputSignal<ReadonlyArray<string>> = input<ReadonlyArray<string>>(
    [],
  );

  /** Whether the overlay's zone-polygon layer is shown. */
  public readonly showZones: InputSignal<boolean> = input<boolean>(true);

  /** Whether the overlay's equipment-pin layer is shown. */
  public readonly showEquipment: InputSignal<boolean> = input<boolean>(true);

  /** Whether the loaded overlay carries at least one zone or pin — gates the layer switches. */
  public readonly overlayHasContent: InputSignal<boolean> = input<boolean>(false);

  /** Whether the compact-viewport panel opener renders — mirrors `FacilityBuilding3dPage`'s own toolbar button. */
  public readonly panelOpenerVisible: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may draw/clear a zone outline. */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /** Whether the member may place, move, or remove an equipment pin. */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);

  /** The editor's current pointer-editing mode. */
  public readonly editMode: InputSignal<FacilityPlanEditMode> = input<FacilityPlanEditMode>('none');

  /** The `draw-zone` picker's option list — zones/areas not yet drawn on this plan. */
  public readonly zoneCandidates: InputSignal<ReadonlyArray<FacilityOutput>> = input<
    ReadonlyArray<FacilityOutput>
  >([]);

  /** The `place-pin` picker's option list — equipment not yet pinned on this plan. */
  public readonly equipmentCandidates: InputSignal<ReadonlyArray<EquipmentOutput>> = input<
    ReadonlyArray<EquipmentOutput>
  >([]);

  /** The in-progress `draw-zone` outline's vertex count — disables "Undo"/"Close polygon" below the minimum. */
  public readonly draftPointCount: InputSignal<number> = input<number>(0);

  /** Whether a zone outline write is in flight — disables "Close polygon" for its duration. */
  public readonly isSavingZoneGeometry: InputSignal<boolean> = input<boolean>(false);

  /** The active mode's status line, e.g. the vertex count while drawing — computed by the page from store data. */
  public readonly statusLabel: InputSignal<string> = input<string>('');
  //#endregion

  //#region Outputs
  /** The zone-polygon layer switch was toggled. */
  public readonly showZonesChanged: OutputEmitterRef<boolean> = output<boolean>();

  /** The equipment-pin layer switch was toggled. */
  public readonly showEquipmentChanged: OutputEmitterRef<boolean> = output<boolean>();

  /** A zone/area was picked from the `draw-zone` picker. */
  public readonly zoneDrawTargetPicked: OutputEmitterRef<string> = output<string>();

  /** An equipment item was picked from the `place-pin` picker. */
  public readonly equipmentPlacePicked: OutputEmitterRef<string> = output<string>();

  /** The `draw-zone` picker was opened — the page loads its candidates, guarded against a duplicate fetch. */
  public readonly zonePickerOpened: OutputEmitterRef<void> = output<void>();

  /** The `place-pin` picker was opened — the page loads its candidates, guarded against a duplicate fetch. */
  public readonly equipmentPickerOpened: OutputEmitterRef<void> = output<void>();

  /** "Undo last vertex" was activated. */
  public readonly undoVertexRequested: OutputEmitterRef<void> = output<void>();

  /** "Close polygon" was activated. */
  public readonly closePolygonRequested: OutputEmitterRef<void> = output<void>();

  /** "Enter coordinates" — the `draw-zone` mode's keyboard alternative to tapping the plan. */
  public readonly enterCoordinatesRequested: OutputEmitterRef<void> = output<void>();

  /** "Enter position" — the `place-pin` mode's keyboard alternative to tapping the plan. */
  public readonly enterPositionRequested: OutputEmitterRef<void> = output<void>();

  /** "Cancel" was activated, leaving whichever mode is active. */
  public readonly editingCancelled: OutputEmitterRef<void> = output<void>();

  /** The compact-viewport panel opener was activated. */
  public readonly panelOpenRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** "Draw a zone…" picker's placeholder. */
  protected readonly drawZonePlaceholder: string = $localize`:@@facility.plans.editor.drawZonePlaceholder:Draw a zone…`;

  /** "Place equipment…" picker's placeholder. */
  protected readonly placePinPlaceholder: string = $localize`:@@facility.plans.editor.placePinPlaceholder:Place equipment…`;

  /** The compact-viewport panel opener's label. */
  protected readonly panelOpenerLabel: string = $localize`:@@facility.plans.toolbar.openPanel:Zones and equipment`;

  //#endregion

  //#region Methods
  /**
   * Method equipmentCandidateLabel
   * @description A `place-pin` candidate's display label, from the shared plan-label composer.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} candidate - The candidate equipment item.
   * @returns {string} Its display label.
   */
  protected equipmentCandidateLabel(candidate: EquipmentOutput): string {
    return equipmentPlanLabel({
      type: candidate.type,
      serialNumber: candidate.serialNumber ?? null,
      locationLabel: candidate.locationLabel ?? null,
    });
  }

  /**
   * Method onZoneDrawTargetPicked
   * @description The `draw-zone` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish clear.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} facilityId - The picked facility, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onZoneDrawTargetPicked(facilityId: string | null | undefined): void {
    if (!facilityId) return;

    this.zoneDrawTargetPicked.emit(facilityId);
  }

  /**
   * Method onEquipmentPlacePicked
   * @description The `place-pin` picker's `valueChange` — forwards a genuinely picked id, dropping a nullish clear.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} equipmentId - The picked equipment, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onEquipmentPlacePicked(equipmentId: string | null | undefined): void {
    if (!equipmentId) return;

    this.equipmentPlacePicked.emit(equipmentId);
  }
  //#endregion
}

import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {
  resolveFacilityTag,
  type FacilityOutput,
  type FacilityType,
} from '@features/organization/features/facilities/models';
import { Tag, type TagDescriptor } from '@shared/components';

/**
 * Component FacilityDetailHeader
 * @class FacilityDetailHeader
 *
 * @description
 * Presentational header for the facility detail page. Renders the facility
 * identity (avatar, name, type tag, status, code, address, last update) and
 * exposes edit/move action intents to the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-detail-header',
  imports: [DatePipe, TitleCasePipe, AvatarModule, ButtonModule, TagModule, Tag],
  templateUrl: './facility-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailHeader {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   *
   * @description
   * The facility to render in the header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();
  /** Whether the active member can mutate the facility (gates Move/Edit/Delete). */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether a delete request is in flight (disables/loading-gates the Delete button). */
  public readonly deleting: InputSignal<boolean> = input(false);
  //#endregion

  //#region Outputs
  /**
   * Property edit
   * @readonly
   *
   * @description
   * Emitted when the user requests editing the facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly edit: OutputEmitterRef<void> = output<void>();

  /**
   * Property move
   * @readonly
   *
   * @description
   * Emitted when the user requests moving the facility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly move: OutputEmitterRef<void> = output<void>();

  /**
   * Property delete
   * @readonly
   *
   * @description
   * Emitted when the user requests deleting the facility. The page confirms
   * before dispatching the store mutation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly delete: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property facilityTypeIcons
   * @readonly
   *
   * @description
   * Maps facility types to PrimeNG icon classes for avatar and tag icons.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Record<FacilityType, string>}
   */
  protected readonly facilityTypeIcons: Record<FacilityType, string> = {
    site: 'pi pi-globe',
    building: 'pi pi-building',
    floor: 'pi pi-th-large',
    zone: 'pi pi-map',
    area: 'pi pi-map-marker',
  };
  //#endregion

  //#region Methods
  /**
   * Resolves the status badge descriptor for the facility.
   *
   * @param {string} status - Facility lifecycle status.
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveFacilityTag('status', status);
  }
  //#endregion
}

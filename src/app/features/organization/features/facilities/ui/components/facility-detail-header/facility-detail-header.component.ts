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
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';

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
  imports: [DatePipe, TitleCasePipe, AvatarModule, ButtonModule, TagModule],
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
   * Returns the Tailwind background token for the facility status dot.
   *
   * @param {FacilityOutput['status']} status - Facility lifecycle status.
   * @returns {string} Tailwind background color class.
   */
  protected getStatusDotClass(status: FacilityOutput['status']): string {
    return status === 'active' ? 'bg-green-500' : 'bg-orange-500';
  }
  //#endregion
}

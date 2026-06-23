import { inject, Injectable } from '@angular/core';
import { ConnectivityService } from '@core/connectivity';
import type { CreateEquipmentInput } from '@features/organization/features/equipments/models';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionPhotoCompressorService } from '../intervention-photo-compressor';
import { InterventionQrScannerService } from '../intervention-qr-scanner';
import { InterventionSyncCoordinatorService } from '../intervention-sync-coordinator';
import type { InterventionDiscoveryResourcePlan, InterventionFieldDiscovery } from './models';

/**
 * Service InterventionFieldExecutionService
 * @class InterventionFieldExecutionService
 *
 * @description
 * Coordinates field-only resource creation, QR scanning and evidence upload
 * while delegating each business resource to its owning data-access service.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionFieldExecutionService {
  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Provides the current connectivity state.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Persists offline intervention changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property scanner
   * @readonly
   *
   * @description
   * Provides QR scanning operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionQrScannerService}
   */
  private readonly scanner: InterventionQrScannerService = inject<InterventionQrScannerService>(
    InterventionQrScannerService,
  );

  /**
   * Property photoCompressor
   * @readonly
   *
   * @description
   * Compresses field photos before persistence.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionPhotoCompressorService}
   */
  private readonly photoCompressor: InterventionPhotoCompressorService =
    inject<InterventionPhotoCompressorService>(InterventionPhotoCompressorService);

  /**
   * Property syncCoordinator
   * @readonly
   *
   * @description
   * Coordinates background synchronization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionSyncCoordinatorService}
   */
  private readonly syncCoordinator: InterventionSyncCoordinatorService =
    inject<InterventionSyncCoordinatorService>(InterventionSyncCoordinatorService);

  /**
   * Method prepareDiscoveryResource
   * @method prepareDiscoveryResource
   *
   * @description
   * Builds the stable canonical resource operation represented by a field discovery.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} interventionId - Active intervention identifier.
   * @param {InterventionFieldDiscovery} discovery - Field discovery.
   * @param {string} clientId - Stable client-generated resource identifier.
   *
   * @return {InterventionDiscoveryResourcePlan} Prepared resource operation and canonical references.
   */
  public prepareDiscoveryResource(
    organizationId: string,
    interventionId: string,
    discovery: InterventionFieldDiscovery,
    clientId: string,
  ): InterventionDiscoveryResourcePlan {
    const intervention = `/api/interventions/${interventionId}`;
    const organization = `/api/organizations/${organizationId}`;

    if (discovery.action === 'site_setup') {
      const payload: CreateFacilityInput = {
        clientId,
        organization,
        intervention,
        type: 'area',
        name: discovery.target,
      };
      return {
        type: 'facility.create',
        payload,
        targetResource: `/api/facilities/${clientId}`,
      };
    }

    if (discovery.action === 'inventory') {
      const payload: CreateEquipmentInput = {
        clientId,
        organization,
        intervention,
        type: discovery.target,
      };
      return {
        type: 'equipment.create',
        payload,
        targetResource: `/api/equipment/${clientId}`,
      };
    }

    const equipmentId = this.resourceId(discovery.target, 'equipment');
    const payload: CreateInspectionInput = {
      clientId,
      organization,
      intervention,
      equipmentId,
      result: discovery.result,
      performedAt: new Date().toISOString(),
      inspectorType: 'external',
      inspectorName: 'Field agent',
    };
    return {
      type: 'inspection.create',
      payload,
      targetResource: `/api/equipment/${equipmentId}`,
      resultResource: `/api/inspections/${clientId}`,
    };
  }

  /**
   * Method scan
   * @method scan
   *
   * @description
   * Reads a QR value from a field image.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {File} file - Image containing the QR code.
   *
   * @return {Promise<string | null>} Scanned value when detected.
   */
  public scan(file: File): Promise<string | null> {
    return this.scanner.scan(file);
  }

  /**
   * Method attachPhoto
   * @method attachPhoto
   *
   * @description
   * Compresses and uploads or queues an equipment evidence photo.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Active intervention identifier.
   * @param {string} equipmentId - Equipment identifier.
   * @param {File} source - Source evidence photo.
   *
   * @return {Promise<boolean>} Whether the photo was queued for synchronization.
   */
  public async attachPhoto(
    interventionId: string,
    equipmentId: string,
    source: File,
  ): Promise<boolean> {
    const file = await this.photoCompressor.compress(source);
    const clientId = crypto.randomUUID();
    await this.offline.queue(interventionId, 'media.create', {
      clientId,
      equipmentId,
      file,
      fileName: file.name,
    });
    if (!this.connectivity.isOffline()) await this.syncCoordinator.syncAll();
    const operations = await this.offline.listOutbox(interventionId);
    return operations.some(
      (operation) =>
        operation.type === 'media.create' && operation.payload['clientId'] === clientId,
    );
  }

  /**
   * Method scanSupported
   * @method scanSupported
   *
   * @description
   * Determines whether QR scanning is supported by the browser.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {boolean} Whether QR scanning is supported.
   */
  public scanSupported(): boolean {
    return this.scanner.isSupported();
  }

  /**
   * Method resourceId
   * @method resourceId
   *
   * @description
   * Extracts a resource identifier from an IRI.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} value - Full IRI string.
   * @param {string} resource - Resource path segment (e.g. `equipment`).
   *
   * @returns {string} Bare identifier extracted from the IRI.
   */
  private resourceId(value: string, resource: string): string {
    const match = value.match(new RegExp(`^/api/${resource}/([^/?#]+)$`));
    if (!match?.[1]) throw new Error(`Invalid ${resource} resource`);
    return match[1];
  }
}

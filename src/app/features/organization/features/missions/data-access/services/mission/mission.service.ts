import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { HydraApiService } from '@core/services/hydra-api';
import type {
  CreateEquipmentInput,
  EquipmentOutput,
} from '@features/organization/features/equipments/models';
import type {
  CreateFacilityInput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import type {
  CreateInspectionInput,
  InspectionOutput,
} from '@features/organization/features/inspections/models';
import type {
  MediaOutput,
  MissionIssueOutput,
  MissionOutput,
  PublicationOutput,
} from '@features/organization/features/missions/models';

/**
 * Service MissionService
 * @class MissionService
 * @extends {HydraApiService}
 *
 * @description
 * Data-access service for field mission workflows.
 *
 * This service centralizes all mission-oriented HTTP operations used by the
 * mission pages:
 * - mission listing, detail retrieval and creation,
 * - publication workflow and issue retrieval,
 * - mission-scoped creation/listing of facilities, equipment and inspections,
 * - media upload linked to equipment evidence.
 *
 * @since 1.0.0
 */
@Injectable({ providedIn: 'root' })
export class MissionService extends HydraApiService {
  /**
   * Method list
   *
   * @description
   * Returns missions belonging to a specific organization.
   *
   * @param {string} organizationId - Active organization identifier.
   * @returns {Observable<HydraCollection<MissionOutput>>} Mission collection.
   */
  public list(organizationId: string): Observable<HydraCollection<MissionOutput>> {
    return this.getCollection<MissionOutput>('/api/missions', {
      params: { organization: `/api/organizations/${organizationId}` },
    });
  }

  /**
   * Method get
   *
   * @description
   * Returns a single mission by identifier.
   *
   * @param {string} missionId - Mission identifier.
   * @returns {Observable<MissionOutput>} Mission resource.
   */
  public get(missionId: string): Observable<MissionOutput> {
    return this.getOne<MissionOutput>(`/api/missions/${missionId}`);
  }

  /**
   * Method create
   *
   * @description
   * Creates a new mission under the given organization.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} name - Human-readable mission name.
   * @returns {Observable<MissionOutput>} Created mission resource.
   */
  public create(organizationId: string, name: string): Observable<MissionOutput> {
    return this.post<Record<string, string>, MissionOutput>('/api/missions', {
      organization: `/api/organizations/${organizationId}`,
      type: 'site_setup',
      name,
      referencePack: '/api/reference-packs/fr-erp-ert-v1',
    });
  }

  /**
   * Method listIssues
   *
   * @description
   * Retrieves mission validation/publication issues.
   *
   * @param {string} missionId - Mission identifier.
   * @returns {Observable<HydraCollection<MissionIssueOutput>>} Mission issue collection.
   */
  public listIssues(missionId: string): Observable<HydraCollection<MissionIssueOutput>> {
    return this.getCollection<MissionIssueOutput>(`/api/missions/${missionId}/issues`);
  }

  /**
   * Method publish
   *
   * @description
   * Starts mission publication for the current mission revision.
   *
   * @param {MissionOutput} mission - Mission to publish.
   * @returns {Observable<PublicationOutput>} Publication job/resource.
   */
  public publish(mission: MissionOutput): Observable<PublicationOutput> {
    return this.post<{ mission: string; missionRevision: number }, PublicationOutput>(
      '/api/publications',
      { mission: `/api/missions/${mission.id}`, missionRevision: mission.revision },
    );
  }

  /**
   * Method listFacilities
   *
   * @description
   * Lists facilities filtered by organization and mission.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @returns {Observable<HydraCollection<FacilityOutput>>} Facility collection.
   */
  public listFacilities(
    organizationId: string,
    missionId: string,
  ): Observable<HydraCollection<FacilityOutput>> {
    return this.getCollection<FacilityOutput>('/api/facilities', {
      params: {
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
    });
  }

  /**
   * Method createFacility
   *
   * @description
   * Creates a mission-scoped facility.
   *
   * When a `clientId` is present, optimistic/offline replay semantics are
   * enabled with `If-None-Match: *` to avoid duplicate creation.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @param {CreateFacilityInput} input - Facility payload.
   * @returns {Observable<FacilityOutput>} Created facility.
   */
  public createFacility(
    organizationId: string,
    missionId: string,
    input: CreateFacilityInput,
  ): Observable<FacilityOutput> {
    return this.post<CreateFacilityInput, FacilityOutput>(
      '/api/facilities',
      {
        ...input,
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
      input.clientId ? { headers: { 'If-None-Match': '*' } } : undefined,
    );
  }

  /**
   * Method listEquipment
   *
   * @description
   * Lists equipment filtered by organization and mission.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @returns {Observable<HydraCollection<EquipmentOutput>>} Equipment collection.
   */
  public listEquipment(
    organizationId: string,
    missionId: string,
  ): Observable<HydraCollection<EquipmentOutput>> {
    return this.getCollection<EquipmentOutput>('/api/equipment', {
      params: {
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
    });
  }

  /**
   * Method createEquipment
   *
   * @description
   * Creates mission-scoped equipment.
   *
   * When a `clientId` is present, optimistic/offline replay semantics are
   * enabled with `If-None-Match: *` to avoid duplicate creation.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @param {CreateEquipmentInput} input - Equipment payload.
   * @returns {Observable<EquipmentOutput>} Created equipment.
   */
  public createEquipment(
    organizationId: string,
    missionId: string,
    input: CreateEquipmentInput,
  ): Observable<EquipmentOutput> {
    return this.post<CreateEquipmentInput, EquipmentOutput>(
      '/api/equipment',
      {
        ...input,
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
      input.clientId ? { headers: { 'If-None-Match': '*' } } : undefined,
    );
  }

  /**
   * Method listInspections
   *
   * @description
   * Lists inspections filtered by organization and mission.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @returns {Observable<HydraCollection<InspectionOutput>>} Inspection collection.
   */
  public listInspections(
    organizationId: string,
    missionId: string,
  ): Observable<HydraCollection<InspectionOutput>> {
    return this.getCollection<InspectionOutput>('/api/inspections', {
      params: {
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
    });
  }

  /**
   * Method createInspection
   *
   * @description
   * Creates mission-scoped inspection data.
   *
   * When a `clientId` is present, optimistic/offline replay semantics are
   * enabled with `If-None-Match: *` to avoid duplicate creation.
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {string} missionId - Mission identifier.
   * @param {CreateInspectionInput} input - Inspection payload.
   * @returns {Observable<InspectionOutput>} Created inspection.
   */
  public createInspection(
    organizationId: string,
    missionId: string,
    input: CreateInspectionInput,
  ): Observable<InspectionOutput> {
    return this.post<CreateInspectionInput, InspectionOutput>(
      '/api/inspections',
      {
        ...input,
        organization: `/api/organizations/${organizationId}`,
        mission: `/api/missions/${missionId}`,
      },
      input.clientId ? { headers: { 'If-None-Match': '*' } } : undefined,
    );
  }

  /**
   * Method uploadMedia
   *
   * @description
   * Uploads mission evidence media for a given equipment item.
   *
   * Uses multipart form-data and keeps Hydra accept headers for response
   * consistency with the rest of the API.
   *
   * @param {string} equipmentId - Equipment identifier.
   * @param {Blob} file - Binary file payload.
   * @param {string} fileName - Original/normalized filename.
   * @returns {Observable<MediaOutput>} Uploaded media resource.
   */
  public uploadMedia(equipmentId: string, file: Blob, fileName: string): Observable<MediaOutput> {
    const body = new FormData();
    body.set('equipment', `/api/equipment/${equipmentId}`);
    body.set('file', file, fileName);

    return this.http.post<MediaOutput>(this.buildUrl('/api/media'), body, {
      withCredentials: true,
      headers: { Accept: 'application/ld+json' },
    });
  }
}

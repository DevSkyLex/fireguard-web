import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { ComplianceTreeNodeOutput } from '@features/organization/features/facilities/models';

/**
 * Service ComplianceTreeService
 * @class ComplianceTreeService
 * @extends {HydraApiService}
 *
 * @description
 * Minimal transport for the Compliance-owned facility tree
 * (`GET /api/organizations/{organizationId}/facility-tree`), read by the
 * facilities map's compliance layer to join a compliance rate onto each
 * pin. `FacilityService` is the org-scoped-facilities family, but this
 * route is Compliance module territory and returns a different, recursive
 * shape (`ComplianceTreeNodeOutput`) — a dedicated, minimal service keeps
 * `FacilityService` from taking on a foreign resource, at the cost of one
 * small file (`ARCHITECTURE.md` §10.6). A sibling branch
 * (`feat/compliance-explorer`) is building its own, richer compliance
 * transport for the explorer surface; this service is deliberately scoped
 * to what the map needs and is expected to be consolidated with that
 * branch's service at merge time (`FEATURE.md`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ComplianceTreeService extends HydraApiService {
  //#region Public Methods
  /**
   * Method getTree
   * @method getTree
   *
   * @description
   * Retrieves the organization's facility tree with compliance data, as a
   * collection of root nodes each recursively carrying its own children.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization whose tree is requested.
   *
   * @return {Observable<HydraCollection<ComplianceTreeNodeOutput>>} An observable emitting the root nodes.
   */
  public getTree(organizationId: string): Observable<HydraCollection<ComplianceTreeNodeOutput>> {
    return this.getCollection<ComplianceTreeNodeOutput>(
      `/api/organizations/${organizationId}/facility-tree`,
    );
  }
  //#endregion
}

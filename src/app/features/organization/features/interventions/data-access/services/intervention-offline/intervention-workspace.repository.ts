import { inject, Service } from '@angular/core';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
  InterventionEquipmentCatalogSnapshot,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from './intervention-database.service';
import type {
  InterventionResourceRecord,
  InterventionScopedRecord,
  InterventionWorkspaceSnapshot,
} from './models';

/**
 * Service InterventionWorkspaceRepository
 * @class InterventionWorkspaceRepository
 *
 * @description
 * Persists and reads normalized intervention workspaces (intervention, work items,
 * changes and issues) on top of {@link InterventionDatabaseService}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionWorkspaceRepository {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * IndexedDB infrastructure backing the workspace object stores.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject<InterventionDatabaseService>(
    InterventionDatabaseService,
  );
  //#endregion

  //#region Methods
  /**
   * Method saveEquipmentCatalog
   * @method saveEquipmentCatalog
   *
   * @description
   * Caches a complete authorized catalogue only while its requesting account owns the workspace.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} interventionId - Persisted field workspace identifier.
   * @param {string} organizationId - Owning organization identifier.
   * @param {readonly EquipmentTypeOutput[]} entries - Complete authorized catalogue.
   * @param {string | null} expectedOwner - Account captured before the catalogue request.
   *
   * @returns {Promise<void>} Settles after persistence or abandonment of a stale response.
   */
  public async saveEquipmentCatalog(
    interventionId: string,
    organizationId: string,
    entries: readonly EquipmentTypeOutput[],
    expectedOwner: string | null,
  ): Promise<void> {
    const isCurrent = (): boolean =>
      expectedOwner !== null && expectedOwner === this.database.currentOwnerId();
    if (!isCurrent() || !expectedOwner) return;
    await this.database.ensureOwnerBound();
    if (!isCurrent()) return;
    const intervention = await this.database.get<InterventionOutput>(
      'interventions',
      interventionId,
    );
    if (!isCurrent() || intervention?.organization !== `/api/organizations/${organizationId}`)
      return;
    const snapshot: InterventionEquipmentCatalogSnapshot = {
      version: 1,
      accountId: expectedOwner,
      organizationId,
      capturedAt: new Date().toISOString(),
      entries,
    };
    await this.database.put(
      'metadata',
      `equipmentCatalog:${expectedOwner}:${organizationId}:${interventionId}`,
      snapshot,
      isCurrent,
    );
    if (!isCurrent()) return;
  }

  /**
   * Method saveWorkspace
   * @method saveWorkspace
   *
   * @description
   * Persists a normalized intervention workspace locally.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - intervention value.
   * @param {readonly InterventionWorkItemOutput[]} workItems - work Items value.
   * @param {readonly InterventionChangeOutput[]} changes - changes value.
   * @param {readonly InterventionIssueOutput[]} issues - issues value.
   * @param {readonly unknown[]} [resources] - resources value.
   * @param {{ readonly replace?: boolean }} [options] - options value.
   *
   * @returns {Promise<void>} Result of the save workspace operation.
   */
  public async saveWorkspace(
    intervention: InterventionOutput,
    workItems: readonly InterventionWorkItemOutput[],
    changes: readonly InterventionChangeOutput[],
    issues: readonly InterventionIssueOutput[],
    resources: readonly unknown[] = [],
    options: { readonly replace?: boolean } = {},
  ): Promise<void> {
    await this.database.ensureOwnerBound();
    const interventionIri = `/api/interventions/${intervention.id}`;
    if (options.replace !== false) {
      await Promise.all([
        this.database.removeWhere<InterventionWorkItemOutput>(
          'workItems',
          (item) => item.intervention === interventionIri,
        ),
        this.database.removeWhere<InterventionChangeOutput>(
          'changes',
          (change) => change.intervention === interventionIri,
        ),
        this.database.removeWhere<InterventionScopedRecord>(
          'resources',
          (resource) => resource.interventionId === intervention.id,
        ),
      ]);
    }
    await Promise.all([
      this.database.putMany('interventions', [{ key: intervention.id, value: intervention }]),
      this.database.putMany(
        'workItems',
        workItems.map((item) => ({
          key: item.id,
          value: item,
        })),
      ),
      this.database.putMany(
        'changes',
        changes.map((change) => ({
          key: change.id,
          value: change,
        })),
      ),
      this.database.putMany('resources', [
        ...issues.map((issue, index) => ({
          key: `${intervention.id}:issue:${index}`,
          value: { interventionId: intervention.id, kind: 'issue', value: issue },
        })),
        ...resources.map((resource: unknown, index) => ({
          key: `${intervention.id}:resource:${index}`,
          value: { interventionId: intervention.id, kind: 'resource', value: resource },
        })),
      ]),
    ]);
    await this.database.put(
      'metadata',
      `prefetchedAt:${intervention.id}`,
      new Date().toISOString(),
    );
  }

  /**
   * Method getWorkspace
   * @method getWorkspace
   *
   * @description
   * Reads a locally persisted intervention workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   *
   * @returns {Promise<InterventionWorkspaceSnapshot | null>} Account-scoped saved workspace.
   */
  public async getWorkspace(interventionId: string): Promise<InterventionWorkspaceSnapshot | null> {
    const owner = this.database.currentOwnerId();
    if (!owner) return null;
    await this.database.ensureOwnerBound();
    if (owner !== this.database.currentOwnerId()) return null;
    const intervention = await this.database.get<InterventionOutput>(
      'interventions',
      interventionId,
    );
    if (!intervention || owner !== this.database.currentOwnerId()) return null;
    const interventionIri = `/api/interventions/${interventionId}`;
    const organizationId = intervention.organization.match(
      /^\/api\/organizations\/([^/?#]+)$/,
    )?.[1];
    const [workItems, changes, resources, catalog] = await Promise.all([
      this.database.getAll<InterventionWorkItemOutput>('workItems'),
      this.database.getAll<InterventionChangeOutput>('changes'),
      this.database.getAll<InterventionResourceRecord>('resources'),
      organizationId
        ? this.database.get<InterventionEquipmentCatalogSnapshot>(
            'metadata',
            `equipmentCatalog:${owner}:${organizationId}:${interventionId}`,
          )
        : Promise.resolve(null),
    ]);
    if (owner !== this.database.currentOwnerId()) return null;

    return {
      intervention,
      ...(catalog?.version === 1 &&
      catalog.accountId === owner &&
      catalog.organizationId === organizationId &&
      Array.isArray(catalog.entries)
        ? { equipmentCatalog: catalog }
        : {}),
      workItems: workItems.filter((item) => item.intervention === interventionIri),
      changes: changes.filter((change) => change.intervention === interventionIri),
      issues: resources
        .filter(
          (resource) => resource.interventionId === interventionId && resource.kind === 'issue',
        )
        .map((resource) => resource.value as InterventionIssueOutput),
    };
  }

  /**
   * Method listInterventions
   * @method listInterventions
   *
   * @description
   * Lists locally persisted interventions belonging to one organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization identifier.
   *
   * @returns {Promise<readonly InterventionOutput[]>} Locally persisted interventions.
   */
  public async listInterventions(organizationId: string): Promise<readonly InterventionOutput[]> {
    await this.database.ensureOwnerBound();
    const organization = `/api/organizations/${organizationId}`;
    const interventions = await this.database.getAll<InterventionOutput>('interventions');

    return interventions.filter((intervention) => intervention.organization === organization);
  }

  /**
   * Method organizationIdForIntervention
   * @method organizationIdForIntervention
   *
   * @description
   * Resolves the organization owning a locally persisted intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - Intervention identifier.
   *
   * @returns {Promise<string | null>} Owning organization identifier when available.
   */
  public async organizationIdForIntervention(interventionId: string): Promise<string | null> {
    await this.database.ensureOwnerBound();
    const intervention = await this.database.get<InterventionOutput>(
      'interventions',
      interventionId,
    );
    const match = intervention?.organization.match(/^\/api\/organizations\/([^/?#]+)$/);

    return match?.[1] ?? null;
  }
  //#endregion
}

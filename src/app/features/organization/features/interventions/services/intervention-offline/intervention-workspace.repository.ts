import { inject, Injectable } from '@angular/core';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
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
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
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
  private readonly database: InterventionDatabaseService = inject<InterventionDatabaseService>(InterventionDatabaseService);
  //#endregion

  //#region Methods
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
   * @return {Promise<void>} Result of the save workspace operation.
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
   * @return {Promise<{
   * intervention: InterventionOutput;
   * workItems: readonly InterventionWorkItemOutput[];
   * changes: readonly InterventionChangeOutput[];
   * issues: readonly InterventionIssueOutput[];
   * } | null>} Result of the get workspace operation.
   */
  public async getWorkspace(interventionId: string): Promise<InterventionWorkspaceSnapshot | null> {
    await this.database.ensureOwnerBound();
    const intervention = await this.database.get<InterventionOutput>(
      'interventions',
      interventionId,
    );
    if (!intervention) return null;
    const interventionIri = `/api/interventions/${interventionId}`;
    const [workItems, changes, resources] = await Promise.all([
      this.database.getAll<InterventionWorkItemOutput>('workItems'),
      this.database.getAll<InterventionChangeOutput>('changes'),
      this.database.getAll<InterventionResourceRecord>('resources'),
    ]);

    return {
      intervention,
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
   * @return {Promise<readonly InterventionOutput[]>} Locally persisted interventions.
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
   * @return {Promise<string | null>} Owning organization identifier when available.
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

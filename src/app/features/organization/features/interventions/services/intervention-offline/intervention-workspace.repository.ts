import { inject, Injectable } from '@angular/core';
import type {
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';
import { MissionDatabaseService } from './mission-database.service';
import type {
  MissionResourceRecord,
  MissionScopedRecord,
  MissionWorkspaceSnapshot,
} from './models';

/**
 * Service MissionWorkspaceRepository
 * @class MissionWorkspaceRepository
 *
 * @description
 * Persists and reads normalized mission workspaces (mission, work items,
 * changes and issues) on top of {@link MissionDatabaseService}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionWorkspaceRepository {
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
   * @type {MissionDatabaseService}
   */
  private readonly database: MissionDatabaseService = inject(MissionDatabaseService);
  //#endregion

  //#region Methods
  /**
   * Method saveWorkspace
   * @method saveWorkspace
   *
   * @description
   * Persists a normalized mission workspace locally.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {MissionOutput} mission - mission value.
   * @param {readonly MissionWorkItemOutput[]} workItems - work Items value.
   * @param {readonly MissionChangeOutput[]} changes - changes value.
   * @param {readonly MissionIssueOutput[]} issues - issues value.
   * @param {readonly unknown[]} [resources] - resources value.
   * @param {{ readonly replace?: boolean }} [options] - options value.
   *
   * @return {Promise<void>} Result of the save workspace operation.
   */
  public async saveWorkspace(
    mission: MissionOutput,
    workItems: readonly MissionWorkItemOutput[],
    changes: readonly MissionChangeOutput[],
    issues: readonly MissionIssueOutput[],
    resources: readonly unknown[] = [],
    options: { readonly replace?: boolean } = {},
  ): Promise<void> {
    await this.database.ensureOwnerBound();
    const missionIri = `/api/missions/${mission.id}`;
    if (options.replace !== false) {
      await Promise.all([
        this.database.removeWhere<MissionWorkItemOutput>(
          'workItems',
          (item) => item.mission === missionIri,
        ),
        this.database.removeWhere<MissionChangeOutput>(
          'changes',
          (change) => change.mission === missionIri,
        ),
        this.database.removeWhere<MissionScopedRecord>(
          'resources',
          (resource) => resource.missionId === mission.id,
        ),
      ]);
    }
    await Promise.all([
      this.database.putMany('missions', [{ key: mission.id, value: mission }]),
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
          key: `${mission.id}:issue:${index}`,
          value: { missionId: mission.id, kind: 'issue', value: issue },
        })),
        ...resources.map((resource: unknown, index) => ({
          key: `${mission.id}:resource:${index}`,
          value: { missionId: mission.id, kind: 'resource', value: resource },
        })),
      ]),
    ]);
    await this.database.put('metadata', `prefetchedAt:${mission.id}`, new Date().toISOString());
  }

  /**
   * Method getWorkspace
   * @method getWorkspace
   *
   * @description
   * Reads a locally persisted mission workspace.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - mission Id value.
   *
   * @return {Promise<{
   * mission: MissionOutput;
   * workItems: readonly MissionWorkItemOutput[];
   * changes: readonly MissionChangeOutput[];
   * issues: readonly MissionIssueOutput[];
   * } | null>} Result of the get workspace operation.
   */
  public async getWorkspace(missionId: string): Promise<MissionWorkspaceSnapshot | null> {
    await this.database.ensureOwnerBound();
    const mission = await this.database.get<MissionOutput>('missions', missionId);
    if (!mission) return null;
    const missionIri = `/api/missions/${missionId}`;
    const [workItems, changes, resources] = await Promise.all([
      this.database.getAll<MissionWorkItemOutput>('workItems'),
      this.database.getAll<MissionChangeOutput>('changes'),
      this.database.getAll<MissionResourceRecord>('resources'),
    ]);

    return {
      mission,
      workItems: workItems.filter((item) => item.mission === missionIri),
      changes: changes.filter((change) => change.mission === missionIri),
      issues: resources
        .filter((resource) => resource.missionId === missionId && resource.kind === 'issue')
        .map((resource) => resource.value as MissionIssueOutput),
    };
  }

  /**
   * Method listMissions
   * @method listMissions
   *
   * @description
   * Lists locally persisted missions belonging to one organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Organization identifier.
   *
   * @return {Promise<readonly MissionOutput[]>} Locally persisted missions.
   */
  public async listMissions(organizationId: string): Promise<readonly MissionOutput[]> {
    await this.database.ensureOwnerBound();
    const organization = `/api/organizations/${organizationId}`;
    const missions = await this.database.getAll<MissionOutput>('missions');

    return missions.filter((mission) => mission.organization === organization);
  }

  /**
   * Method organizationIdForMission
   * @method organizationIdForMission
   *
   * @description
   * Resolves the organization owning a locally persisted mission.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} missionId - Mission identifier.
   *
   * @return {Promise<string | null>} Owning organization identifier when available.
   */
  public async organizationIdForMission(missionId: string): Promise<string | null> {
    await this.database.ensureOwnerBound();
    const mission = await this.database.get<MissionOutput>('missions', missionId);
    const match = mission?.organization.match(/^\/api\/organizations\/([^/?#]+)$/);

    return match?.[1] ?? null;
  }
  //#endregion
}

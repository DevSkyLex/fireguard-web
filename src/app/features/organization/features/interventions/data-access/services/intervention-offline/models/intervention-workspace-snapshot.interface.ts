import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
  InterventionEquipmentCatalogSnapshot,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionWorkspaceSnapshot
 * @interface
 *
 * @description
 * Offline view of an intervention and its loaded work items, changes, and readiness issues.
 */
export interface InterventionWorkspaceSnapshot {
  /**
   * Property equipmentCatalog
   * @readonly
   *
   * @description
   * Complete equipment catalogue authorized for this workspace owner and organization.
   * Historical snapshots without catalogue metadata remain readable.
   *
   * @access public
   *
   * @type {InterventionEquipmentCatalogSnapshot | undefined}
   */
  readonly equipmentCatalog?: InterventionEquipmentCatalogSnapshot;

  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Contains the intervention currently loaded into the workspace.
   *
   * @access public
   *
   * @type {InterventionOutput}
   */
  readonly intervention: InterventionOutput;

  /**
   * Property workItems
   * @readonly
   *
   * @description
   * Contains the work items currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionWorkItemOutput[]}
   */
  readonly workItems: readonly InterventionWorkItemOutput[];

  /**
   * Property changes
   * @readonly
   *
   * @description
   * Contains the proposed changes currently loaded for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionChangeOutput[]}
   */
  readonly changes: readonly InterventionChangeOutput[];

  /**
   * Property issues
   * @readonly
   *
   * @description
   * Contains readiness issues currently reported for this intervention.
   *
   * @access public
   *
   * @type {readonly InterventionIssueOutput[]}
   */
  readonly issues: readonly InterventionIssueOutput[];
}

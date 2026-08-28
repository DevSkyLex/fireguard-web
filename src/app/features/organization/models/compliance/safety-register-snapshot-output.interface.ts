import type { HydraItem } from '@core/api/models';

/**
 * Interface SafetyRegisterSnapshotOutput
 * @interface SafetyRegisterSnapshotOutput
 *
 * @description
 * One dated, immutable archive of the regulatory "registre de sécurité" PDF
 * (`GET /organizations/{organizationId}/compliance/register-snapshots`):
 * metadata only — the PDF itself is fetched through the per-snapshot
 * `…/register-snapshots/{snapshotId}/download` endpoint.
 */
export interface SafetyRegisterSnapshotOutput extends HydraItem {
  //#region Properties
  /** The snapshot's identifier. */
  readonly id: string;

  /** The organization the snapshot belongs to. */
  readonly organizationId: string;

  /** Set only for a facility-scoped register; absent for the organization-wide one. */
  readonly facilityId?: string | null;

  /** The register's scope: `organization` or `facility`. */
  readonly scope: string;

  /** ISO 8601 datetime the archived register was generated at. */
  readonly generatedAt: string;

  /** The member who archived the register. */
  readonly generatedByUserId: string;

  /** SHA-256 hash of the stored PDF's bytes. */
  readonly contentHash: string;

  /** The stored PDF's size, in bytes. */
  readonly sizeBytes: number;

  /** ISO 8601 datetime the snapshot row was created at. */
  readonly createdAt: string;
  //#endregion
}

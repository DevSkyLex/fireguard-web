import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { ComplianceService } from '@features/organization/data-access';
import type {
  ComplianceFacilityTreeNodeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { flattenComplianceTree } from '@features/organization/utils';
import type { TreeNode } from '@shared/tree';
import type { ComplianceExplorerState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seed state: nothing loaded, nothing exporting.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: ComplianceExplorerState = {
  treeCallState: idleCallState(),
  summaryCallState: idleCallState(),
  exportCallState: idleCallState(),
};

/**
 * Store ComplianceExplorerStore
 * @const ComplianceExplorerStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the estate explorer's
 * compliance axis: the enriched facility hierarchy (eager, mapped through
 * `flattenComplianceTree` onto the shared `Tree` primitive's shape), the
 * selected — or organization-wide — compliance summary, and the
 * safety-register export. `loadSummary` and `exportSafetyRegister` both
 * `switchMap`, so switching the selected facility mid-flight cancels
 * whatever was still in flight; `loadTree` is fetched once per organization.
 *
 * @example
 * ```typescript
 * @Component({ providers: [ComplianceExplorerStore] })
 * export class OrganizationAssetsPage {
 *   protected readonly compliance = inject(ComplianceExplorerStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceExplorerStore = signalStore(
  //#region State
  withState<ComplianceExplorerState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** The tree roots, mapped onto the shared `Tree` primitive's shape. */
    roots: computed<ReadonlyArray<TreeNode<ComplianceFacilityTreeNodeOutput>>>(
      () => flattenComplianceTree(store.treeCallState().data?.nodes ?? []).roots,
    ),

    /** Every branch's children, keyed by parent id — fully populated, never lazy. */
    childrenByParent: computed<
      Readonly<Record<string, ReadonlyArray<TreeNode<ComplianceFacilityTreeNodeOutput>>>>
    >(() => flattenComplianceTree(store.treeCallState().data?.nodes ?? []).childrenByParent),

    /** Whether the tree is still resolving. */
    isLoadingTree: computed<boolean>(() => isCallPending(store.treeCallState())),

    /** Whether the tree failed to load. */
    hasTreeError: computed<boolean>(() => isCallError(store.treeCallState())),

    /** The active summary — the selected facility's, or the organization rollup. */
    summary: computed<ComplianceSummaryOutput | null>(() => store.summaryCallState().data ?? null),

    /** Whether the summary is still resolving. */
    isLoadingSummary: computed<boolean>(() => isCallPending(store.summaryCallState())),

    /** Whether the summary failed to load. */
    hasSummaryError: computed<boolean>(() => isCallError(store.summaryCallState())),

    /** Whether a safety-register export is currently in flight. */
    isExporting: computed<boolean>(() => isCallPending(store.exportCallState())),

    /** Whether the last export attempt failed. */
    hasExportError: computed<boolean>(() => isCallError(store.exportCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      complianceService = inject<ComplianceService>(ComplianceService),
      browserDownload = inject<BrowserDownloadService>(BrowserDownloadService),
    ) => ({
      /**
       * Method loadTree
       *
       * @description
       * Loads the organization's enriched facility hierarchy.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {rxMethod<string>}
       */
      loadTree: rxMethod<string>(
        pipe(
          switchMap((organizationId: string) => {
            patchState(store, { treeCallState: pendingCallState(store.treeCallState().data) });

            return complianceService.getFacilityTree(organizationId).pipe(
              tapResponse({
                next: (tree): void => {
                  patchState(store, { treeCallState: successCallState(tree) });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    treeCallState: errorCallState(toStoreError(error), store.treeCallState().data),
                  });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method loadSummary
       *
       * @description
       * Loads the compliance summary in scope: facility-scoped when
       * `facilityId` is given, organization-wide otherwise.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {rxMethod<{ organizationId: string; facilityId?: string }>}
       */
      loadSummary: rxMethod<{ readonly organizationId: string; readonly facilityId?: string }>(
        pipe(
          switchMap(({ organizationId, facilityId }) => {
            patchState(store, {
              summaryCallState: pendingCallState(store.summaryCallState().data),
            });

            const request = facilityId
              ? complianceService.getFacilityCompliance(organizationId, facilityId)
              : complianceService.getOrganizationCompliance(organizationId);

            return request.pipe(
              tapResponse({
                next: (summary): void => {
                  patchState(store, { summaryCallState: successCallState(summary) });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    summaryCallState: errorCallState(
                      toStoreError(error),
                      store.summaryCallState().data,
                    ),
                  });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method exportSafetyRegister
       *
       * @description
       * Exports the safety-register PDF in scope — facility-scoped when
       * `facilityId` is given, organization-wide otherwise — and saves it
       * to the visitor's device under `fileName` through
       * `BrowserDownloadService`.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {rxMethod<{ organizationId: string; facilityId?: string; fileName: string }>}
       */
      exportSafetyRegister: rxMethod<{
        readonly organizationId: string;
        readonly facilityId?: string;
        readonly fileName: string;
      }>(
        pipe(
          switchMap(({ organizationId, facilityId, fileName }) => {
            patchState(store, { exportCallState: pendingCallState() });

            const request = facilityId
              ? complianceService.exportFacilitySafetyRegister(organizationId, facilityId)
              : complianceService.exportOrganizationSafetyRegister(organizationId);

            return request.pipe(
              tapResponse({
                next: (blob: Blob): void => {
                  browserDownload.trigger(blob, fileName);
                  patchState(store, { exportCallState: successCallState(null) });
                },
                error: (error: unknown): void => {
                  patchState(store, { exportCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
  //#endregion
);

/**
 * Type ComplianceExplorerStoreType
 *
 * @description
 * Instance type of the {@link ComplianceExplorerStore} signal store.
 *
 * @version 1.0.0
 */
export type ComplianceExplorerStoreType = InstanceType<typeof ComplianceExplorerStore>;

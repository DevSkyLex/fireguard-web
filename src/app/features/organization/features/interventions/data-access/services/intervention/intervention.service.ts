import { Injectable } from '@angular/core';
import { EMPTY, expand, of, reduce, switchMap, takeWhile, timer, type Observable } from 'rxjs';
import type { HydraCollection, HydraItem, PaginationOptions } from '@core/models/api';
import { HydraApiService } from '@core/services/hydra-api';
import type {
  CreateInterventionChangeInput,
  CreateInterventionWorkItemInput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionStatus,
  InterventionTypeOutput,
  InterventionWorkItemOutput,
  PublicationOutput,
  UpdateInterventionChangeInput,
  UpdateInterventionWorkItemInput,
} from '@features/organization/features/interventions/models';

/**
 * Constant PUBLICATION_POLL_INTERVAL_MS
 * @const PUBLICATION_POLL_INTERVAL_MS
 *
 * @description
 * Provides the publication poll interval ms value.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PUBLICATION_POLL_INTERVAL_MS = 1_000;

/**
 * Constant WORKSPACE_PAGE_SIZE
 * @const WORKSPACE_PAGE_SIZE
 *
 * @description
 * Provides the workspace page size value.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const WORKSPACE_PAGE_SIZE = 100;

/**
 * Constant isPublicationRunning
 * @const isPublicationRunning
 *
 * @description
 * Provides the is publication running value.
 *
 * @since 1.0.0
 *
 * @type {(publication: PublicationOutput) => boolean}
 */
const isPublicationRunning = (publication: PublicationOutput): boolean =>
  publication.status === 'pending' || publication.status === 'processing';

/**
 * Service InterventionService
 * @class InterventionService
 * @extends {HydraApiService}
 *
 * @description
 * Owns the canonical intervention workflow resources. Facility, Equipment,
 * Inspection and Media operations remain in their owning feature services.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionService extends HydraApiService {
  /**
   * Method list
   * @method list
   *
   * @description
   * Executes the list operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {PaginationOptions & {
   * responsible?: string;
   * participant?: string;
   * type?: string;
   * status?: string;
   * site?: string;
   * dueAtAfter?: string;
   * dueAtBefore?: string;
   * }} [options] - options value.
   *
   * @return {Observable<HydraCollection<InterventionOutput>>} Result of the list operation.
   */
  public list(
    organizationId: string,
    options?: PaginationOptions & {
      responsible?: string;
      participant?: string;
      type?: string;
      status?: string;
      site?: string;
      dueAtAfter?: string;
      dueAtBefore?: string;
    },
  ): Observable<HydraCollection<InterventionOutput>> {
    const params: Record<string, string> = { organization: `/api/organizations/${organizationId}` };
    for (const [key, value] of Object.entries(options ?? {})) {
      if (key === 'page' || key === 'itemsPerPage') continue;
      if (value) params[key] = value;
    }

    return this.getCollection<InterventionOutput>('/api/interventions', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
    });
  }

  /**
   * Method listAll
   * @method listAll
   *
   * @description
   * Executes the list all operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
   * responsible?: string;
   * participant?: string;
   * type?: string;
   * status?: string;
   * site?: string;
   * dueAtAfter?: string;
   * dueAtBefore?: string;
   * }} [options] - options value.
   *
   * @return {Observable<readonly InterventionOutput[]>} Result of the list all operation.
   */
  public listAll(
    organizationId: string,
    options?: Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
      responsible?: string;
      participant?: string;
      type?: string;
      status?: string;
      site?: string;
      dueAtAfter?: string;
      dueAtBefore?: string;
    },
  ): Observable<readonly InterventionOutput[]> {
    return this.collectPages((page) =>
      this.list(organizationId, { ...options, page, itemsPerPage: WORKSPACE_PAGE_SIZE }),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Executes the get operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   *
   * @return {Observable<InterventionOutput>} Result of the get operation.
   */
  public get(interventionId: string): Observable<InterventionOutput> {
    return this.getOne<InterventionOutput>(`/api/interventions/${interventionId}`);
  }

  /**
   * Method listTypes
   * @method listTypes
   *
   * @description
   * Executes the list types operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<HydraCollection<InterventionTypeOutput>>} Result of the list types operation.
   */
  public listTypes(): Observable<HydraCollection<InterventionTypeOutput>> {
    return this.getCollection<InterventionTypeOutput>('/api/intervention-types');
  }

  /**
   * Method create
   * @method create
   *
   * @description
   * Executes the create operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {string} name - name value.
   * @param {Partial<{
   * type: InterventionOutput['type'];
   * site: string;
   * responsible: string;
   * participants: readonly string[];
   * priority: InterventionOutput['priority'];
   * plannedStartAt: string;
   * dueAt: string;
   * }>} [options] - options value.
   *
   * @return {Observable<InterventionOutput>} Result of the create operation.
   */
  public create(
    organizationId: string,
    name: string,
    options?: Partial<{
      type: InterventionOutput['type'];
      site: string;
      responsible: string;
      participants: readonly string[];
      priority: InterventionOutput['priority'];
      plannedStartAt: string;
      dueAt: string;
    }>,
  ): Observable<InterventionOutput> {
    return this.post<Record<string, unknown>, InterventionOutput>('/api/interventions', {
      organization: `/api/organizations/${organizationId}`,
      type: options?.type ?? 'site_setup',
      name,
      ...(options?.site ? { site: options.site } : {}),
      ...(options?.responsible ? { responsible: options.responsible } : {}),
      participants: options?.participants ?? [],
      priority: options?.priority ?? 'normal',
      ...(options?.plannedStartAt ? { plannedStartAt: options.plannedStartAt } : {}),
      ...(options?.dueAt ? { dueAt: options.dueAt } : {}),
    });
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Executes the update operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {Partial<{
   * name: string;
   * status: InterventionStatus;
   * site: string | null;
   * responsible: string | null;
   * participants: readonly string[];
   * priority: InterventionOutput['priority'];
   * plannedStartAt: string | null;
   * dueAt: string | null;
   * reviewNote: string | null;
   * }>} input - input value.
   * @param {number} [revision] - revision value.
   *
   * @return {Observable<InterventionOutput>} Result of the update operation.
   */
  public update(
    interventionId: string,
    input: Partial<{
      name: string;
      status: InterventionStatus;
      site: string | null;
      responsible: string | null;
      participants: readonly string[];
      priority: InterventionOutput['priority'];
      plannedStartAt: string | null;
      dueAt: string | null;
      reviewNote: string | null;
    }>,
    revision?: number,
  ): Observable<InterventionOutput> {
    return this.patch<typeof input, InterventionOutput>(
      `/api/interventions/${interventionId}`,
      input,
      {
        headers: revision === undefined ? undefined : { 'If-Match': `"revision-${revision}"` },
      },
    );
  }

  /**
   * Method listWorkItems
   * @method listWorkItems
   *
   * @description
   * Executes the list work items operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {PaginationOptions & {
   * assignee?: string;
   * source?: string;
   * action?: string;
   * status?: string;
   * }} [options] - options value.
   *
   * @return {Observable<HydraCollection<InterventionWorkItemOutput>>} Result of the list work items operation.
   */
  public listWorkItems(
    interventionId: string,
    options?: PaginationOptions & {
      assignee?: string;
      source?: string;
      action?: string;
      status?: string;
    },
  ): Observable<HydraCollection<InterventionWorkItemOutput>> {
    const params: Record<string, string> = { intervention: `/api/interventions/${interventionId}` };
    if (options?.assignee) params['assignee'] = options.assignee;
    if (options?.source) params['source'] = options.source;
    if (options?.action) params['action'] = options.action;
    if (options?.status) params['status'] = options.status;

    return this.getCollection<InterventionWorkItemOutput>('/api/intervention-work-items', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
    });
  }

  /**
   * Method listAllWorkItems
   * @method listAllWorkItems
   *
   * @description
   * Executes the list all work items operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
   * assignee?: string;
   * source?: string;
   * action?: string;
   * status?: string;
   * }} [options] - options value.
   *
   * @return {Observable<readonly InterventionWorkItemOutput[]>} Result of the list all work items operation.
   */
  public listAllWorkItems(
    interventionId: string,
    options?: Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
      assignee?: string;
      source?: string;
      action?: string;
      status?: string;
    },
  ): Observable<readonly InterventionWorkItemOutput[]> {
    return this.collectPages((page) =>
      this.listWorkItems(interventionId, { ...options, page, itemsPerPage: WORKSPACE_PAGE_SIZE }),
    );
  }

  /**
   * Method createWorkItem
   * @method createWorkItem
   *
   * @description
   * Executes the create work item operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateInterventionWorkItemInput} input - input value.
   *
   * @return {Observable<InterventionWorkItemOutput>} Result of the create work item operation.
   */
  public createWorkItem(
    input: CreateInterventionWorkItemInput,
  ): Observable<InterventionWorkItemOutput> {
    if (input.clientId) {
      const { clientId, ...body } = input;
      return this.put<typeof body, InterventionWorkItemOutput>(
        `/api/intervention-work-items/${clientId}`,
        body,
        { headers: { 'If-None-Match': '*' } },
      );
    }

    return this.post<CreateInterventionWorkItemInput, InterventionWorkItemOutput>(
      '/api/intervention-work-items',
      input,
    );
  }

  /**
   * Method updateWorkItem
   * @method updateWorkItem
   *
   * @description
   * Executes the update work item operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} workItemId - work Item Id value.
   * @param {UpdateInterventionWorkItemInput} input - input value.
   * @param {number} [revision] - revision value.
   *
   * @return {Observable<InterventionWorkItemOutput>} Result of the update work item operation.
   */
  public updateWorkItem(
    workItemId: string,
    input: UpdateInterventionWorkItemInput,
    revision?: number,
  ): Observable<InterventionWorkItemOutput> {
    return this.patch<UpdateInterventionWorkItemInput, InterventionWorkItemOutput>(
      `/api/intervention-work-items/${workItemId}`,
      input,
      { headers: revision === undefined ? undefined : { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method removeWorkItem
   * @method removeWorkItem
   *
   * @description
   * Executes the remove work item operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} workItemId - work Item Id value.
   * @param {number} revision - revision value.
   *
   * @return {Observable<void>} Result of the remove work item operation.
   */
  public removeWorkItem(workItemId: string, revision: number): Observable<void> {
    return this.delete(`/api/intervention-work-items/${workItemId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method listChanges
   * @method listChanges
   *
   * @description
   * Executes the list changes operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {PaginationOptions & { resource?: string; status?: string }} [options] - options value.
   *
   * @return {Observable<HydraCollection<InterventionChangeOutput>>} Result of the list changes operation.
   */
  public listChanges(
    interventionId: string,

    options?: PaginationOptions & { resource?: string; status?: string },
  ): Observable<HydraCollection<InterventionChangeOutput>> {
    const params: Record<string, string> = { intervention: `/api/interventions/${interventionId}` };
    if (options?.resource) params['resource'] = options.resource;
    if (options?.status) params['status'] = options.status;

    return this.getCollection<InterventionChangeOutput>('/api/intervention-changes', {
      page: options?.page,
      itemsPerPage: options?.itemsPerPage,
      params,
    });
  }

  /**
   * Method listAllChanges
   * @method listAllChanges
   *
   * @description
   * Executes the list all changes operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
   * resource?: string;
   * status?: string;
   * }} [options] - options value.
   *
   * @return {Observable<readonly InterventionChangeOutput[]>} Result of the list all changes operation.
   */
  public listAllChanges(
    interventionId: string,
    options?: Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
      resource?: string;
      status?: string;
    },
  ): Observable<readonly InterventionChangeOutput[]> {
    return this.collectPages((page) =>
      this.listChanges(interventionId, { ...options, page, itemsPerPage: WORKSPACE_PAGE_SIZE }),
    );
  }

  /**
   * Method createChange
   * @method createChange
   *
   * @description
   * Executes the create change operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateInterventionChangeInput} input - input value.
   *
   * @return {Observable<InterventionChangeOutput>} Result of the create change operation.
   */
  public createChange(input: CreateInterventionChangeInput): Observable<InterventionChangeOutput> {
    if (input.clientId) {
      const { clientId, ...body } = input;
      return this.put<typeof body, InterventionChangeOutput>(
        `/api/intervention-changes/${clientId}`,
        body,
        {
          headers: { 'If-None-Match': '*' },
        },
      );
    }

    return this.post<CreateInterventionChangeInput, InterventionChangeOutput>(
      '/api/intervention-changes',
      input,
    );
  }

  /**
   * Method updateChange
   * @method updateChange
   *
   * @description
   * Executes the update change operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} changeId - change Id value.
   * @param {UpdateInterventionChangeInput} input - input value.
   * @param {number} [revision] - revision value.
   *
   * @return {Observable<InterventionChangeOutput>} Result of the update change operation.
   */
  public updateChange(
    changeId: string,
    input: UpdateInterventionChangeInput,
    revision?: number,
  ): Observable<InterventionChangeOutput> {
    return this.patch<UpdateInterventionChangeInput, InterventionChangeOutput>(
      `/api/intervention-changes/${changeId}`,
      input,
      { headers: revision === undefined ? undefined : { 'If-Match': `"revision-${revision}"` } },
    );
  }

  /**
   * Method listIssues
   * @method listIssues
   *
   * @description
   * Executes the list issues operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   *
   * @return {Observable<HydraCollection<InterventionIssueOutput>>} Result of the list issues operation.
   */
  public listIssues(interventionId: string): Observable<HydraCollection<InterventionIssueOutput>> {
    return this.getCollection<InterventionIssueOutput>(
      `/api/interventions/${interventionId}/issues`,
    );
  }

  /**
   * Method publish
   * @method publish
   *
   * @description
   * Executes the publish operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - intervention value.
   *
   * @return {Observable<PublicationOutput>} Result of the publish operation.
   */
  public publish(intervention: InterventionOutput): Observable<PublicationOutput> {
    return this.post<{ intervention: string; interventionRevision: number }, PublicationOutput>(
      '/api/publications',
      {
        intervention: `/api/interventions/${intervention.id}`,
        interventionRevision: intervention.revision,
      },
    );
  }

  /**
   * Method getPublication
   * @method getPublication
   *
   * @description
   * Executes the get publication operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} publicationId - publication Id value.
   *
   * @return {Observable<PublicationOutput>} Result of the get publication operation.
   */
  public getPublication(publicationId: string): Observable<PublicationOutput> {
    return this.getOne<PublicationOutput>(`/api/publications/${publicationId}`);
  }

  /**
   * Method pollPublication
   * @method pollPublication
   *
   * @description
   * Executes the poll publication operation.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PublicationOutput} initial - initial value.
   *
   * @return {Observable<PublicationOutput>} Result of the poll publication operation.
   */
  public pollPublication(initial: PublicationOutput): Observable<PublicationOutput> {
    return of(initial).pipe(
      expand((publication) =>
        isPublicationRunning(publication)
          ? timer(PUBLICATION_POLL_INTERVAL_MS).pipe(
              switchMap(() => this.getPublication(publication.id)),
            )
          : EMPTY,
      ),
      takeWhile(isPublicationRunning, true),
    );
  }

  /**
   * Method collectPages
   * @method collectPages
   *
   * @description
   * Executes the collect pages operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {(page: number) => Observable<HydraCollection<T>>} loadPage - load Page value.
   *
   * @return {Observable<readonly T[]>} Result of the collect pages operation.
   */
  private collectPages<T extends HydraItem>(
    loadPage: (page: number) => Observable<HydraCollection<T>>,
  ): Observable<readonly T[]> {
    return loadPage(1).pipe(
      expand((collection, pageIndex) =>
        (pageIndex + 1) * WORKSPACE_PAGE_SIZE < collection.totalItems
          ? loadPage(pageIndex + 2)
          : EMPTY,
      ),
      reduce((items, collection) => [...items, ...collection.member], [] as readonly T[]),
    );
  }
}

import { Service } from '@angular/core';
import {
  EMPTY,
  expand,
  forkJoin,
  map,
  of,
  reduce,
  switchMap,
  take,
  takeWhile,
  timer,
  type Observable,
} from 'rxjs';
import { HydraApiService } from '@core/api';
import type { HydraCollection, HydraItem, PaginationOptions } from '@core/api/models';
import type {
  CreateInterventionChangeInput,
  CreateInterventionWorkItemInput,
  InterventionActivityOutput,
  InterventionAttachmentOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionCalendarFilters,
  InterventionListOptions,
  InterventionOutput,
  InterventionTypeOutput,
  InterventionWorkItemOutput,
  PublicationOutput,
  UpdateInterventionChangeInput,
  UpdateInterventionInput,
  UpdateInterventionWorkItemInput,
} from '@features/organization/features/interventions/models';

/**
 * Constant PUBLICATION_POLL_INTERVAL_MS
 * @const PUBLICATION_POLL_INTERVAL_MS
 *
 * @description
 * Delay between two successive publication status reads while polling.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PUBLICATION_POLL_INTERVAL_MS = 1_000;

/**
 * Constant PUBLICATION_POLL_MAX_EMISSIONS
 * @const PUBLICATION_POLL_MAX_EMISSIONS
 *
 * @description
 * Upper bound on the polling stream's emissions (initial state + one per
 * interval tick, so ~2 minutes at the current interval). Without it a
 * publication stuck in `processing` server-side would keep the publish
 * dialog spinning forever; hitting the bound completes the stream with the
 * publication still running, which callers must treat as a failure.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const PUBLICATION_POLL_MAX_EMISSIONS = 121;

const toSecondsUtc = (date: Date): string => `${date.toISOString().slice(0, 19)}Z`;

/**
 * Constant WORKSPACE_PAGE_SIZE
 * @const WORKSPACE_PAGE_SIZE
 *
 * @description
 * Page size the `listAll*` helpers request per call while draining a
 * collection, matching the API's clamp so each page is as large as allowed.
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
 * Whether a publication is still `pending` or `processing` server-side, i.e.
 * worth another poll tick.
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
@Service()
export class InterventionService extends HydraApiService {
  /**
   * Method list
   * @method list
   *
   * @description
   * Reads one page of `/api/interventions` scoped to the organization,
   * forwarding the name/status/type/site/people/due-date filters and the
   * `order[field]` sort params alongside pagination.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {PaginationOptions & {
   * name?: string;
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
    options?: InterventionListOptions,
  ): Observable<HydraCollection<InterventionOutput>> {
    const params: Record<string, string> = { organization: `/api/organizations/${organizationId}` };
    for (const [key, value] of Object.entries(options ?? {})) {
      if (key === 'page' || key === 'itemsPerPage' || key === 'order') continue;
      if (value) params[key] = value as string;
    }
    if (options?.order) {
      for (const [field, direction] of Object.entries(options.order)) {
        params[`order[${field}]`] = direction;
      }
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
   * Drains every page of {@link list} (at {@link WORKSPACE_PAGE_SIZE} items a
   * request) into one flat array, keeping the caller's filters and sort.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - organization Id value.
   * @param {Omit<PaginationOptions, 'page' | 'itemsPerPage'> & {
   * name?: string;
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
    options?: Omit<InterventionListOptions, 'page' | 'itemsPerPage'>,
  ): Observable<readonly InterventionOutput[]> {
    return this.collectPages((page) =>
      this.list(organizationId, { ...options, page, itemsPerPage: WORKSPACE_PAGE_SIZE }),
    );
  }

  /**
   * Method listCalendarWindow
   * @method listCalendarWindow
   *
   * @description
   * Loads every organization intervention whose schedule anchor (the planned
   * start, falling back to the due date) falls inside a bounded date window, so
   * the calendar never fetches the entire org history. Because a single API
   * range filter cannot express the `plannedStartAt ?? dueAt` anchor, the window
   * is fetched as the union of two bounded queries — one filtered by the planned
   * start, one by the due date (catching interventions with only a due date) —
   * merged and de-duped by id. Both bounds are inclusive; over-fetching (an
   * intervention whose anchor lands outside the visible cells) is harmless since
   * the calendar grid only renders anchors inside its cells.
   *
   * `filters` narrows both queries the same way the list and board are narrowed,
   * so switching render does not silently widen the result. It deliberately
   * carries no date bound: the window already is the calendar's date filter.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} organizationId - Active organization identifier.
   * @param {Date} after - Inclusive lower window bound.
   * @param {Date} before - Inclusive upper window bound.
   * @param {InterventionCalendarFilters} [filters] - Non-date narrowing to apply to both queries.
   *
   * @return {Observable<readonly InterventionOutput[]>} Interventions inside the window, de-duped by id.
   */
  public listCalendarWindow(
    organizationId: string,
    after: Date,
    before: Date,
    filters?: InterventionCalendarFilters,
  ): Observable<readonly InterventionOutput[]> {
    const afterIso: string = toSecondsUtc(after);
    const beforeIso: string = toSecondsUtc(before);

    return forkJoin([
      this.listAll(organizationId, {
        ...filters,
        plannedStartAtAfter: afterIso,
        plannedStartAtBefore: beforeIso,
      }),
      this.listAll(organizationId, { ...filters, dueAtAfter: afterIso, dueAtBefore: beforeIso }),
    ]).pipe(
      map(([byPlannedStart, byDueDate]): readonly InterventionOutput[] => {
        const merged = new Map<string, InterventionOutput>();
        for (const intervention of [...byPlannedStart, ...byDueDate]) {
          merged.set(intervention.id, intervention);
        }

        return [...merged.values()];
      }),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Reads one intervention by identifier (`GET /api/interventions/{id}`).
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
   * Method listActivities
   * @method listActivities
   *
   * @description
   * Loads one page of the intervention's activity timeline (comments and
   * system entries such as status changes), sorted `createdAt` ascending by
   * the API.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {number} [page] - Page number, forwarded as-is to the API.
   *
   * @return {Observable<HydraCollection<InterventionActivityOutput>>} Result of the list activities operation.
   */
  public listActivities(
    interventionId: string,
    page?: number,
  ): Observable<HydraCollection<InterventionActivityOutput>> {
    return this.getCollection<InterventionActivityOutput>(
      `/api/interventions/${interventionId}/activities`,
      { page },
    );
  }

  /**
   * Method addComment
   * @method addComment
   *
   * @description
   * Posts a comment onto the intervention's activity timeline.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {string} body - Comment text (max 2000 characters).
   * @param {string} [clientId] - Idempotency key, set only when replaying from the
   *   offline outbox. Replaying the same key returns the stored comment instead of
   *   appending a second one — a response lost in the field is indistinguishable,
   *   from the device, from a request that never arrived.
   *
   * @return {Observable<InterventionActivityOutput>} The created comment activity entry.
   */
  public addComment(
    interventionId: string,
    body: string,
    clientId?: string,
  ): Observable<InterventionActivityOutput> {
    return this.post<{ body: string; clientId?: string }, InterventionActivityOutput>(
      `/api/interventions/${interventionId}/comments`,
      clientId === undefined ? { body } : { body, clientId },
    );
  }

  /**
   * Method listTypes
   * @method listTypes
   *
   * @description
   * Reads the intervention-type catalog (`GET /api/intervention-types`).
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
   * Creates an intervention (`POST /api/interventions`), defaulting the type
   * to `site_setup` and the priority to `normal`, and serializing the planned
   * start and due dates to second-precision UTC.
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
   * plannedStartAt: Date;
   * dueAt: Date;
   * description: string | null;
   * labelIds: readonly string[];
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
      plannedStartAt: Date;
      dueAt: Date;
      description: string | null;
      labelIds: readonly string[];
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
      ...(options?.plannedStartAt ? { plannedStartAt: toSecondsUtc(options.plannedStartAt) } : {}),
      ...(options?.dueAt ? { dueAt: toSecondsUtc(options.dueAt) } : {}),
      ...(options?.description !== undefined ? { description: options.description } : {}),
      ...(options?.labelIds ? { labelIds: options.labelIds } : {}),
    });
  }

  /**
   * Method update
   * @method update
   *
   * @description
   * Merge-patches an intervention (`PATCH /api/interventions/{id}`),
   * serializing the date fields to second-precision UTC (or `null` to clear)
   * and sending the revision as an `If-Match` precondition when provided.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {UpdateInterventionInput} input - The subset of fields to patch.
   * `labelIds`, when present, replaces the intervention's whole label set
   * (merge-patch semantics); omit the key to leave labels untouched.
   * @param {number} [revision] - revision value.
   *
   * @return {Observable<InterventionOutput>} Result of the update operation.
   */
  public update(
    interventionId: string,
    input: UpdateInterventionInput,
    revision?: number,
  ): Observable<InterventionOutput> {
    const body: Record<string, unknown> = { ...input };
    if ('plannedStartAt' in input)
      body['plannedStartAt'] = input.plannedStartAt ? toSecondsUtc(input.plannedStartAt) : null;
    if ('dueAt' in input) body['dueAt'] = input.dueAt ? toSecondsUtc(input.dueAt) : null;

    return this.patch<Record<string, unknown>, InterventionOutput>(
      `/api/interventions/${interventionId}`,
      body,
      {
        headers: revision === undefined ? undefined : { 'If-Match': `"revision-${revision}"` },
      },
    );
  }

  /**
   * Method remove
   * @method remove
   *
   * @description
   * Deletes an intervention (`DELETE /api/interventions/{id}`). Only draft
   * or abandoned interventions may be deleted — the API refuses any other
   * status with a 409 conflict.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {number} revision - Current intervention revision, required as the `If-Match` precondition.
   *
   * @return {Observable<void>} Result of the remove operation.
   */
  public remove(interventionId: string, revision: number): Observable<void> {
    return this.delete(`/api/interventions/${interventionId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method listWorkItems
   * @method listWorkItems
   *
   * @description
   * Reads one page of `/api/intervention-work-items` filtered to the
   * intervention, optionally narrowed by assignee, source, action or status.
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
   * Drains every page of {@link listWorkItems} into one flat array, keeping
   * the caller's filters.
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
   * Creates a work item. With a `clientId` (offline replay) it becomes an
   * idempotent `PUT /api/intervention-work-items/{clientId}` guarded by
   * `If-None-Match: *`, so a replayed create never duplicates; otherwise a
   * plain `POST`.
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
   * Merge-patches one work item (`PATCH /api/intervention-work-items/{id}`),
   * sending the revision as an `If-Match` precondition when provided.
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
   * Deletes one work item (`DELETE /api/intervention-work-items/{id}`),
   * pinned to its revision through `If-Match`.
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
   * Reads one page of `/api/intervention-changes` filtered to the
   * intervention, optionally narrowed by resource or status.
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
   * Drains every page of {@link listChanges} into one flat array, keeping the
   * caller's filters.
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
   * Proposes a change. With a `clientId` (offline replay) it becomes an
   * idempotent `PUT /api/intervention-changes/{clientId}` guarded by
   * `If-None-Match: *`, so a replayed create never duplicates; otherwise a
   * plain `POST`.
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
   * Merge-patches one change (`PATCH /api/intervention-changes/{id}`),
   * sending the revision as an `If-Match` precondition when provided.
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
   * Method listAttachments
   * @method listAttachments
   *
   * @description
   * Lists an intervention's attachments — metadata only, the API exposes no
   * download URL yet.
   *
   * @access public
   * @since 4.4.0
   *
   * @param {string} interventionId - intervention Id value.
   *
   * @return {Observable<HydraCollection<InterventionAttachmentOutput>>} The attachments.
   */
  public listAttachments(
    interventionId: string,
  ): Observable<HydraCollection<InterventionAttachmentOutput>> {
    return this.getCollection<InterventionAttachmentOutput>(
      `/api/interventions/${interventionId}/attachments`,
    );
  }

  /**
   * Method uploadAttachment
   * @method uploadAttachment
   *
   * @description
   * Uploads one file as a multipart request (`file` + optional `label`),
   * mirroring `EquipmentService.uploadEvidence`'s FormData shape. The
   * backend enforces 10 MiB and its MIME whitelist; callers pre-check to
   * fail fast, the server stays authoritative.
   *
   * @access public
   * @since 4.4.0
   *
   * @param {string} interventionId - intervention Id value.
   * @param {Blob} file - file value.
   * @param {string} fileName - file Name value.
   * @param {string} [label] - optional operator label.
   *
   * @return {Observable<InterventionAttachmentOutput>} The created attachment.
   */
  public uploadAttachment(
    interventionId: string,
    file: Blob,
    fileName: string,
    label?: string,
  ): Observable<InterventionAttachmentOutput> {
    const body: FormData = new FormData();
    body.set('file', file, fileName);
    if (label) body.set('label', label);

    return this.http.post<InterventionAttachmentOutput>(
      this.buildUrl(`/api/interventions/${interventionId}/attachments`),
      body,
      { withCredentials: true, headers: { Accept: 'application/ld+json' } },
    );
  }

  /**
   * Method removeAttachment
   * @method removeAttachment
   *
   * @description
   * Deletes one attachment, pinned to its revision.
   *
   * @access public
   * @since 4.4.0
   *
   * @param {string} attachmentId - attachment Id value.
   * @param {number} revision - revision value.
   *
   * @return {Observable<void>} Completion of the delete.
   */
  public removeAttachment(attachmentId: string, revision: number): Observable<void> {
    return this.delete(`/api/intervention-attachments/${attachmentId}`, {
      headers: { 'If-Match': `"revision-${revision}"` },
    });
  }

  /**
   * Method listIssues
   * @method listIssues
   *
   * @description
   * Reads the intervention's quality issues
   * (`GET /api/interventions/{id}/issues`).
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
   * Starts a publication (`POST /api/publications`) for the intervention,
   * pinned to its current revision so a concurrent edit fails the publish
   * rather than publishing stale content.
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
   * Re-reads one publication's current state
   * (`GET /api/publications/{id}`) — the read {@link pollPublication} repeats.
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
   * Re-reads a publication once per interval until it leaves
   * `pending`/`processing`, emitting each observed state. The stream is
   * bounded by {@link PUBLICATION_POLL_MAX_EMISSIONS}: past that it completes
   * with the last (possibly still running) state, so a caller must check the
   * final status rather than assume completion means terminal.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PublicationOutput} initial - The publication as the create call returned it.
   *
   * @return {Observable<PublicationOutput>} Every polled state, ending on the terminal one or at the bound.
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
      take(PUBLICATION_POLL_MAX_EMISSIONS),
    );
  }

  /**
   * Method collectPages
   * @method collectPages
   *
   * @description
   * Sequentially walks `loadPage` from page one until `totalItems` is
   * covered (at a {@link WORKSPACE_PAGE_SIZE} stride) and concatenates every
   * page's members into one array.
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

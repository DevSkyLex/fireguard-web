import { inject, Service } from '@angular/core';
import {
  catchError,
  defer,
  forkJoin,
  from,
  map,
  of,
  switchMap,
  throwError,
  type Observable,
} from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import {
  InterventionOfflineService,
  InterventionTimeRepository,
  InterventionTimeService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionTimeScope,
  InterventionTimeWrite,
  InterventionTimeJournalView,
} from '@features/organization/features/interventions/models';
import { projectInterventionTime } from '@features/organization/features/interventions/utils';

/**
 * Service InterventionTimeJournalService
 * @class InterventionTimeJournalService
 *
 * @description
 * Coordinates cancellable authorized reads and idempotent manual journal writes.
 * Network failures queue the same client identifier; permission and revision errors never queue.
 *
 * @version 1.0.0
 */
@Service()
export class InterventionTimeJournalService {
  /**
   * Property api
   * @readonly
   *
   * @description
   * Journal transport.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionTimeService}
   */
  private readonly api: InterventionTimeService = inject(InterventionTimeService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Existing account-bound outbox.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /**
   * Property repository
   * @readonly
   *
   * @description
   * Independent time snapshots and drafts.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionTimeRepository}
   */
  private readonly repository: InterventionTimeRepository = inject(InterventionTimeRepository);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared network classification.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Method read
   * @method read
   *
   * @description
   * Reads a server journal or its explicit offline snapshot and overlays pending intentions.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionTimeScope} scope - Captured task/account scope.
   * @returns {Observable<InterventionTimeJournalView>} Journal with draft and synchronization status.
   */
  public read(scope: InterventionTimeScope): Observable<InterventionTimeJournalView> {
    return defer(() => {
      const owner = this.offline.publicationOwner();
      const cached = () =>
        from(this.repository.readJournal(scope.interventionId, scope.workItemId)).pipe(
          map((entries) => ({
            entries: entries ?? [],
            offline: true,
            historyUnavailable: entries === null,
          })),
        );
      const remote = this.api.journal(scope.workItemId).pipe(
        switchMap((journal) =>
          from(
            this.repository.saveJournal(
              {
                interventionId: scope.interventionId,
                workItemId: scope.workItemId,
                entries: journal.entries,
              },
              owner,
            ),
          ).pipe(
            map(() => ({ entries: journal.entries, offline: false, historyUnavailable: false })),
          ),
        ),
        catchError((error: unknown) =>
          this.connectivity.isNetworkFailure(error) ? cached() : throwError(() => error),
        ),
      );
      return forkJoin({
        journal: this.connectivity.isOffline() ? cached() : remote,
        draft: from(this.repository.readDraft(scope.interventionId, scope.workItemId)),
        operations: from(this.offline.listOutbox(scope.interventionId)),
      }).pipe(
        map(({ journal, draft, operations }) => {
          if (owner !== this.offline.publicationOwner())
            throw new Error('The active account changed.');
          return {
            ...journal,
            draft,
            entries: projectInterventionTime(journal.entries, operations, scope.workItemId),
          };
        }),
      );
    });
  }

  /**
   * Method write
   * @method write
   *
   * @description
   * Persists factual time even if it reveals overload. It never edits remaining effort.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionTimeScope} scope - Task and actor captured on submission.
   * @param {InterventionTimeWrite} command - Stable entry identifier and reviewed revision.
   * @param {string | null} expectedOwner - Account captured before queued draft persistence.
   * @returns {Observable<'queued' | 'remote'>} Where the intention was durably recorded.
   */
  public write(
    scope: InterventionTimeScope,
    command: InterventionTimeWrite,
    expectedOwner: string | null,
  ): Observable<'queued' | 'remote'> {
    return defer(() => {
      const owner = this.offline.publicationOwner();
      const queue = (): Observable<'queued'> =>
        defer(() => {
          if (!owner || owner !== this.offline.publicationOwner())
            throw new Error('The active account changed.');
          const shared = { workItemId: scope.workItemId, actorId: scope.actorId };
          let operation: Promise<void>;
          if (command.kind === 'cancel') {
            operation = this.offline.queue(scope.interventionId, 'time-entry.cancel', {
              ...shared,
              id: command.id,
              revision: command.revision,
            });
          } else if (command.kind === 'correct') {
            operation = this.offline.queue(scope.interventionId, 'time-entry.correct', {
              ...shared,
              ...command.input,
              revision: command.revision,
            });
          } else {
            operation = this.offline.queue(scope.interventionId, 'time-entry.create', {
              ...shared,
              ...command.input,
              clientId: command.input.id,
            });
          }
          return from(operation).pipe(map(() => 'queued' as const));
        });
      const remote = (): Observable<'remote'> => {
        let request: Observable<unknown>;
        if (command.kind === 'cancel') {
          request = this.api.cancelEntry(scope.workItemId, command.id, command.revision);
        } else if (command.kind === 'correct') {
          request = this.api.correctEntry(scope.workItemId, command.input, command.revision);
        } else {
          request = this.api.createEntry(scope.workItemId, command.input);
        }
        return request.pipe(map(() => 'remote' as const));
      };
      return from(this.offline.listOutbox(scope.interventionId)).pipe(
        switchMap((operations) => {
          if (!owner || owner !== expectedOwner || owner !== this.offline.publicationOwner())
            return throwError(() => new Error('The active account changed.'));
          const hasDependencies = operations.some(
            (operation) =>
              (operation.type === 'work-item.create' &&
                operation.payload.clientId === scope.workItemId) ||
              ('workItemId' in operation.payload &&
                operation.payload.workItemId === scope.workItemId),
          );
          return this.connectivity.isOffline() || hasDependencies
            ? queue()
            : remote().pipe(
                catchError((error: unknown) =>
                  this.connectivity.isNetworkFailure(error) ? queue() : throwError(() => error),
                ),
              );
        }),
        switchMap((source) =>
          command.kind === 'cancel'
            ? of(source)
            : from(this.repository.clearDraft(scope.workItemId, owner)).pipe(map(() => source)),
        ),
      );
    });
  }
}

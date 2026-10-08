import { inject, Service } from '@angular/core';
import {
  catchError,
  concatMap,
  defer,
  EMPTY,
  finalize,
  from,
  map,
  shareReplay,
  switchMap,
  throwError,
  type Observable,
} from 'rxjs';
import { toStoreError } from '@core/request-state';
import {
  ServiceRequestCommandRepository,
  ServiceRequestService,
} from '@features/organization/features/service-requests/data-access';
import type {
  ServiceRequestConversionCommand,
  ServiceRequestOutput,
} from '@features/organization/features/service-requests/models';

/**
 * Class ServiceRequestPersistenceError
 * @class ServiceRequestPersistenceError
 *
 * @description
 * Distinguishes a local acceptance failure from a conversion already transmitted to the server.
 */
export class ServiceRequestPersistenceError extends Error {
  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the storage cause while reporting that the native draft remains available to retry.
   *
   * @access public
   * @since unreleased
   *
   * @param {unknown} cause - Local journal acceptance failure.
   */
  public constructor(cause: unknown) {
    super(
      $localize`:@@serviceRequest.command.persistFailed:This conversion could not be saved on this device. Your draft has been kept. Retry to send it.`,
      { cause },
    );
    this.name = 'ServiceRequestPersistenceError';
  }
  //#endregion
}

/**
 * Class ServiceRequestConversionService
 * @class ServiceRequestConversionService
 *
 * @description
 * Root conversion coordinator completes accepted writes independently of any routed page lifetime.
 */
@Service()
export class ServiceRequestConversionService {
  //#region Properties
  /**
   * Property journal
   * @readonly
   *
   * @description
   * Durable acceptance and account/session fences for replayable conversions.
   *
   * @access private
   * @since unreleased
   *
   * @type {ServiceRequestCommandRepository}
   */
  private readonly journal: ServiceRequestCommandRepository = inject(
    ServiceRequestCommandRepository,
  );

  /**
   * Property service
   * @readonly
   *
   * @description
   * Feature-owned conversion transport.
   *
   * @access private
   * @since unreleased
   *
   * @type {ServiceRequestService}
   */
  private readonly service: ServiceRequestService = inject(ServiceRequestService);

  /**
   * Property accepted
   * @readonly
   *
   * @description
   * Same-session retries join a still-running write rather than transmitting another request.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<string, Observable<ServiceRequestOutput>>}
   */
  private readonly accepted: Map<string, Observable<ServiceRequestOutput>> = new Map();
  //#endregion

  //#region Methods
  /**
   * Method execute
   * @method execute
   *
   * @description
   * Persists before transmission, keeps uncertain outcomes, and acknowledges only confirmed
   * replies.
   *
   * @access public
   * @since unreleased
   *
   * @param {ServiceRequestConversionCommand} command - Immutable conversion declaration.
   * @param {number} revision - Authentication generation captured before acceptance.
   *
   * @returns {Observable<ServiceRequestOutput>} Shared accepted outcome surviving page destruction.
   */
  public execute(
    command: ServiceRequestConversionCommand,
    revision: number,
  ): Observable<ServiceRequestOutput> {
    const key: string = `${command.userId}/${revision}/${command.organizationId}/${command.input.clientOperationId}`;
    const previous: Observable<ServiceRequestOutput> | undefined = this.accepted.get(key);
    if (previous) return previous;
    const current = () => this.journal.isCurrent(command.userId, command.organizationId, revision);
    const accepted: Observable<ServiceRequestOutput> = defer(() =>
      from(this.journal.retain(command, revision)),
    ).pipe(
      catchError((error: unknown) => throwError(() => new ServiceRequestPersistenceError(error))),
      switchMap(() =>
        current()
          ? this.service.convert(command.organizationId, command.request, command.input).pipe(
              catchError((error: unknown) => {
                const failure = toStoreError(error);
                const code: number = Number(failure.code);
                return code >= 400 && code < 500 && !failure.retryable
                  ? from(this.journal.acknowledge(command, revision)).pipe(
                      switchMap(() => throwError(() => error)),
                    )
                  : throwError(() => error);
              }),
            )
          : EMPTY,
      ),
      concatMap((request) =>
        from(this.journal.acknowledge(command, revision)).pipe(map(() => request)),
      ),
      finalize(() => this.accepted.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.accepted.set(key, accepted);
    return accepted;
  }
  //#endregion
}

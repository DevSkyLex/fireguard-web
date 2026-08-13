import { inject, Service } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';

/**
 * Class PublicationPollTimeoutError
 * @class PublicationPollTimeoutError
 * @extends {Error}
 *
 * @description
 * Thrown by {@link InterventionPublicationService.publish} when the bounded
 * poll gives up while the publication is still `pending`/`processing`. Carries
 * the publication's id so a caller can tell this apart from every other
 * rejection and re-check the same publication later, without changing the
 * poll's own timing.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export class PublicationPollTimeoutError extends Error {
  //#region Properties
  /**
   * Property publicationId
   * @readonly
   * @description The publication whose poll timed out.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  public readonly publicationId: string;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Builds the error, fixing its `name` for reliable `instanceof`-free checks.
   * @access public
   * @since 1.0.0
   * @param {string} publicationId - The publication whose poll timed out.
   */
  public constructor(publicationId: string) {
    super('Publication polling timed out before a terminal status.');
    this.name = 'PublicationPollTimeoutError';
    this.publicationId = publicationId;
  }
  //#endregion
}

/**
 * Service InterventionPublicationService
 * @class InterventionPublicationService
 *
 * @description
 * Coordinates asynchronous intervention publication. Submits a publication
 * request and polls the API until a terminal result (`completed` or `failed`)
 * is available, exposing a single `publish` method to callers.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionPublicationService {
  //#region Properties
  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Intervention data-access service used to create and poll publications.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionService}
   */
  private readonly interventions: InterventionService =
    inject<InterventionService>(InterventionService);
  //#endregion

  //#region Methods
  /**
   * Method publish
   * @method publish
   *
   * @description
   * Creates a publication for the given intervention and polls the API
   * until a terminal status is reached. The poll is bounded: when it ends
   * with the publication still `pending`/`processing`, this rejects instead
   * of returning, so a stuck server job reads as a failed request rather
   * than a successful publication.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to publish.
   *
   * @returns {Promise<PublicationOutput>} Terminal publication result.
   */
  public async publish(intervention: InterventionOutput): Promise<PublicationOutput> {
    const publication = await lastValueFrom(this.interventions.publish(intervention));
    const final = await lastValueFrom(this.interventions.pollPublication(publication));

    if (final.status === 'pending' || final.status === 'processing') {
      throw new PublicationPollTimeoutError(final.id);
    }

    return final;
  }

  /**
   * Method checkStatus
   * @method checkStatus
   *
   * @description
   * Re-reads one publication once — the recovery path a caller takes after
   * {@link publish} rejects with a {@link PublicationPollTimeoutError}, so an
   * operator can learn whether the server finished in the background without
   * starting a whole new bounded poll.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {string} publicationId - The publication to re-read.
   *
   * @returns {Promise<PublicationOutput>} The publication's current state.
   */
  public async checkStatus(publicationId: string): Promise<PublicationOutput> {
    return lastValueFrom(this.interventions.getPublication(publicationId));
  }
  //#endregion
}

import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';

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
@Injectable({ providedIn: 'root' })
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
   * until a terminal status is reached.
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
    return lastValueFrom(this.interventions.pollPublication(publication));
  }
  //#endregion
}

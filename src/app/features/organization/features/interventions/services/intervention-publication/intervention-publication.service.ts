import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';

/**
 * Coordinates asynchronous intervention publication and polling.
 */
@Injectable({ providedIn: 'root' })
export class InterventionPublicationService {
  private readonly interventions: InterventionService = inject(InterventionService);

  /**
   * Creates a publication and waits for its terminal representation.
   */
  public async publish(intervention: InterventionOutput): Promise<PublicationOutput> {
    const publication = await lastValueFrom(this.interventions.publish(intervention));
    return lastValueFrom(this.interventions.pollPublication(publication));
  }
}

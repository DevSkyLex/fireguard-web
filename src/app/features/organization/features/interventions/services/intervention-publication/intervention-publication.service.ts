import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { MissionService } from '@features/organization/features/missions/data-access';
import type {
  MissionOutput,
  PublicationOutput,
} from '@features/organization/features/missions/models';

/**
 * Coordinates asynchronous mission publication and polling.
 */
@Injectable({ providedIn: 'root' })
export class MissionPublicationService {
  private readonly missions: MissionService = inject(MissionService);

  /**
   * Creates a publication and waits for its terminal representation.
   */
  public async publish(mission: MissionOutput): Promise<PublicationOutput> {
    const publication = await lastValueFrom(this.missions.publish(mission));
    return lastValueFrom(this.missions.pollPublication(publication));
  }
}

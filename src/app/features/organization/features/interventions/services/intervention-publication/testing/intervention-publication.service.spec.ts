import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import { InterventionPublicationService } from '../intervention-publication.service';

describe('InterventionPublicationService', () => {
  it('should create a publication and resolve with the polled terminal result', async () => {
    const intervention = { id: 'i-1' } as unknown as InterventionOutput;
    const publication = { id: 'pub-1', status: 'pending' } as unknown as PublicationOutput;
    const terminal = { id: 'pub-1', status: 'completed' } as unknown as PublicationOutput;
    const interventions = {
      publish: vi.fn().mockReturnValue(of(publication)),
      pollPublication: vi.fn().mockReturnValue(of(terminal)),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionPublicationService,
        { provide: InterventionService, useValue: interventions },
      ],
    });

    const result = await TestBed.inject(InterventionPublicationService).publish(intervention);

    expect(interventions.publish).toHaveBeenCalledWith(intervention);
    expect(interventions.pollPublication).toHaveBeenCalledWith(publication);
    expect(result).toBe(terminal);
  });
});

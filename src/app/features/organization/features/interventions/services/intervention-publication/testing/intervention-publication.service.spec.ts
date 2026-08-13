import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  PublicationOutput,
} from '@features/organization/features/interventions/models';
import {
  InterventionPublicationService,
  PublicationPollTimeoutError,
} from '../intervention-publication.service';

const setUp = (interventions: {
  publish?: ReturnType<typeof vi.fn>;
  pollPublication?: ReturnType<typeof vi.fn>;
  getPublication?: ReturnType<typeof vi.fn>;
}): InterventionPublicationService => {
  TestBed.configureTestingModule({
    providers: [
      InterventionPublicationService,
      { provide: InterventionService, useValue: interventions },
    ],
  });

  return TestBed.inject(InterventionPublicationService);
};

describe('InterventionPublicationService', () => {
  it('should create a publication and resolve with the polled terminal result', async () => {
    const intervention = { id: 'i-1' } as unknown as InterventionOutput;
    const publication = { id: 'pub-1', status: 'pending' } as unknown as PublicationOutput;
    const terminal = { id: 'pub-1', status: 'completed' } as unknown as PublicationOutput;
    const interventions = {
      publish: vi.fn().mockReturnValue(of(publication)),
      pollPublication: vi.fn().mockReturnValue(of(terminal)),
    };

    const result = await setUp(interventions).publish(intervention);

    expect(interventions.publish).toHaveBeenCalledWith(intervention);
    expect(interventions.pollPublication).toHaveBeenCalledWith(publication);
    expect(result).toBe(terminal);
  });

  it('should reject with a PublicationPollTimeoutError carrying the publication id when the poll gives up', async () => {
    const intervention = { id: 'i-1' } as unknown as InterventionOutput;
    const publication = { id: 'pub-1', status: 'pending' } as unknown as PublicationOutput;
    const stillRunning = { id: 'pub-1', status: 'processing' } as unknown as PublicationOutput;
    const interventions = {
      publish: vi.fn().mockReturnValue(of(publication)),
      pollPublication: vi.fn().mockReturnValue(of(stillRunning)),
    };

    let rejection: unknown;
    try {
      await setUp(interventions).publish(intervention);
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(PublicationPollTimeoutError);
    expect((rejection as PublicationPollTimeoutError).publicationId).toBe('pub-1');
  });

  it('should re-read a publication once through checkStatus', async () => {
    const publication = { id: 'pub-1', status: 'completed' } as unknown as PublicationOutput;
    const interventions = { getPublication: vi.fn().mockReturnValue(of(publication)) };

    const result = await setUp(interventions).checkStatus('pub-1');

    expect(interventions.getPublication).toHaveBeenCalledWith('pub-1');
    expect(result).toBe(publication);
  });
});

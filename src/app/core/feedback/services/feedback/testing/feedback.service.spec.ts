import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { successFeedback } from '@core/request-state';
import { FeedbackService } from '../feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let add: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    add = vi.fn();
    TestBed.configureTestingModule({
      providers: [FeedbackService, { provide: MessageService, useValue: { add } }],
    });
    service = TestBed.inject(FeedbackService);
  });

  it('show forwards severity, summary and the createdAt timestamp', () => {
    service.show(successFeedback('Saved'));

    expect(add).toHaveBeenCalledTimes(1);
    const message = add.mock.calls[0][0];
    expect(message.severity).toBe('success');
    expect(message.summary).toBe('Saved');
    expect(message.detail).toBeUndefined();
    expect(typeof message.life).toBe('number');
    expect(typeof message.data.createdAt).toBe('number');
  });

  it('show uses summary as the title and message as the detail when a summary is set', () => {
    service.show(successFeedback('Saved to library', 'Done'));

    const message = add.mock.calls[0][0];
    expect(message.summary).toBe('Done');
    expect(message.detail).toBe('Saved to library');
  });

  it('error maps to the error severity with a longer life than success', () => {
    service.success('ok');
    service.error('bad');

    const successLife = add.mock.calls[0][0].life;
    const errorMessage = add.mock.calls[1][0];
    expect(errorMessage.severity).toBe('error');
    expect(errorMessage.life).toBeGreaterThan(successLife);
  });

  it('info and warn map to their severities', () => {
    service.info('fyi');
    service.warn('careful');

    expect(add.mock.calls[0][0].severity).toBe('info');
    expect(add.mock.calls[1][0].severity).toBe('warn');
  });
});

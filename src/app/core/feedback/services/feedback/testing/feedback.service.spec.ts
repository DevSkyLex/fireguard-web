import { TestBed } from '@angular/core/testing';
import { successFeedback } from '@core/request-state';
import { FeedbackService } from '../feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FeedbackService] });
    service = TestBed.inject(FeedbackService);
  });

  it('show queues severity, summary and the createdAt timestamp', () => {
    service.show(successFeedback('Saved'));

    const messages = service.messages();
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe('success');
    expect(messages[0].summary).toBe('Saved');
    expect(messages[0].detail).toBeUndefined();
    expect(typeof messages[0].lifeMs).toBe('number');
    expect(typeof messages[0].createdAt).toBe('number');
  });

  it('show uses summary as the title and message as the detail when a summary is set', () => {
    service.show(successFeedback('Saved to library', 'Done'));

    expect(service.messages()[0].summary).toBe('Done');
    expect(service.messages()[0].detail).toBe('Saved to library');
  });

  it('error maps to the error severity with a longer life than success', () => {
    service.success('ok');
    service.error('bad');

    const [success, failure] = service.messages();
    expect(failure.severity).toBe('error');
    expect(failure.lifeMs).toBeGreaterThan(success.lifeMs);
  });

  it('info and warn map to their severities', () => {
    service.info('fyi');
    service.warn('careful');

    expect(service.messages().map((message) => message.severity)).toEqual(['info', 'warn']);
  });

  it('queues messages oldest first and gives each one a distinct id', () => {
    service.info('first');
    service.info('second');

    const [first, second] = service.messages();
    expect(first.summary).toBe('first');
    expect(second.summary).toBe('second');
    expect(first.id).not.toBe(second.id);
  });

  it('dismiss removes only the targeted message', () => {
    service.info('first');
    service.info('second');
    service.dismiss(service.messages()[0].id);

    expect(service.messages().map((message) => message.summary)).toEqual(['second']);
  });

  it('clear empties the queue', () => {
    service.info('fyi');
    service.clear();

    expect(service.messages()).toEqual([]);
  });
});

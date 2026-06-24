import {
  errorFeedback,
  infoFeedback,
  isFeedbackEventPayload,
  successFeedback,
  warnFeedback,
} from '../feedback-payload.utils';

describe('feedback payload factories', () => {
  it('successFeedback builds a success payload', () => {
    const payload = successFeedback('Saved');

    expect(payload.feedback).toBe(true);
    expect(payload.severity).toBe('success');
    expect(payload.message).toBe('Saved');
    expect(payload.code).toBeNull();
    expect(payload.retryable).toBe(false);
    expect(typeof payload.timestamp).toBe('number');
  });

  it('infoFeedback and warnFeedback set their severities', () => {
    expect(infoFeedback('FYI').severity).toBe('info');
    expect(warnFeedback('Careful').severity).toBe('warn');
  });

  it('successFeedback forwards an optional summary', () => {
    expect(successFeedback('Done', 'All set').summary).toBe('All set');
  });

  it('errorFeedback builds an error payload and forwards options', () => {
    const payload = errorFeedback('Boom', { code: 500, retryable: true, timestamp: 42 });

    expect(payload.severity).toBe('error');
    expect(payload.message).toBe('Boom');
    expect(payload.code).toBe(500);
    expect(payload.retryable).toBe(true);
    expect(payload.timestamp).toBe(42);
  });
});

describe('isFeedbackEventPayload', () => {
  it('accepts a feedback payload', () => {
    expect(isFeedbackEventPayload(successFeedback('hi'))).toBe(true);
  });

  it('rejects non-feedback event payloads', () => {
    expect(isFeedbackEventPayload({ message: 'no marker' })).toBe(false);
    expect(isFeedbackEventPayload({ feedback: true })).toBe(false);
    expect(isFeedbackEventPayload({ id: '/organizations/1' })).toBe(false);
    expect(isFeedbackEventPayload(null)).toBe(false);
    expect(isFeedbackEventPayload(undefined)).toBe(false);
    expect(isFeedbackEventPayload('string')).toBe(false);
  });
});

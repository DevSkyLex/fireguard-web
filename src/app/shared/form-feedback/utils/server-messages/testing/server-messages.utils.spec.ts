import { serverMessagesOf } from '../server-messages.utils';

describe('serverMessagesOf', () => {
  it('should return nothing while there is no error', () => {
    expect(serverMessagesOf(null, [], 'Failed')).toEqual([]);
    expect(serverMessagesOf(undefined, [], 'Failed')).toEqual([]);
  });

  it('should flatten the violations, deduplicated, ahead of any message', () => {
    const error = {
      status: 422,
      message: 'Unprocessable',
      violations: [
        { propertyPath: 'name', message: 'Name is taken.' },
        { propertyPath: 'other', message: 'Name is taken.' },
        { propertyPath: 'code', message: 'Code is invalid.' },
      ],
    };

    expect(serverMessagesOf(error, ['name'], 'Failed')).toEqual([
      'Name is taken.',
      'Code is invalid.',
    ]);
  });

  it('should fall back on the normalized StoreError message, then on the generic line', () => {
    expect(
      serverMessagesOf(
        { message: 'Plan quota reached.', retryable: false, timestamp: 1, error: null, code: 409 },
        [],
        'Failed',
      ),
    ).toEqual(['Plan quota reached.']);
    expect(
      serverMessagesOf({ message: '   ', retryable: false, timestamp: 1 }, [], 'Failed'),
    ).toEqual(['Failed']);
    // A raw Error's message is a technical string, never shown to the operator.
    expect(serverMessagesOf(new Error('boom'), [], 'Failed')).toEqual(['Failed']);
  });
});

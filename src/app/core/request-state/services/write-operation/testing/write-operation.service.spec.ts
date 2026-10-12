import { WriteOperationService } from '../write-operation.service';

describe('WriteOperationService', () => {
  it('creates independent immutable identities without retaining caller state', () => {
    const service = new WriteOperationService();
    const first = service.create();
    expect(Object.isFrozen(first)).toBe(true);
    expect(service.create().idempotencyKey).not.toBe(first.idempotencyKey);
    expect(new WriteOperationService().create().idempotencyKey).not.toBe(first.idempotencyKey);
  });

  it('retains unchanged wire inputs but replaces edited, completed and changed-owner intentions', () => {
    const tracker = new WriteOperationService().createTracker();
    const first = tracker.options(
      'login',
      { email: 'user@example.test', password: 'example-value' },
      1,
    );
    expect(
      tracker.options('login', { password: 'example-value', email: 'user@example.test' }, 1),
    ).toBe(first);
    const edited = tracker.options(
      'login',
      { email: 'user@example.test', password: 'edited-value' },
      1,
    );
    expect(edited.idempotencyKey).not.toBe(first.idempotencyKey);
    const ownerChanged = tracker.options(
      'login',
      { email: 'user@example.test', password: 'edited-value' },
      2,
    );
    expect(ownerChanged.idempotencyKey).not.toBe(edited.idempotencyKey);
    tracker.complete('login');
    expect(
      tracker.options('login', { email: 'user@example.test', password: 'edited-value' }, 2)
        .idempotencyKey,
    ).not.toBe(ownerChanged.idempotencyKey);
    tracker.clear();
    expect(
      tracker.options('login', { email: 'user@example.test', password: 'example-value' }, 1)
        .idempotencyKey,
    ).not.toBe(first.idempotencyKey);
  });

  it('isolates caller trackers and requires explicit identities for uploads', () => {
    const service = new WriteOperationService();
    const first = service.createTracker();
    const second = service.createTracker();
    expect(first.options('save', { value: 1 }, 1).idempotencyKey).not.toBe(
      second.options('save', { value: 1 }, 1).idempotencyKey,
    );
    expect(() => first.options('upload', new Blob(['contents']), 1)).toThrow(TypeError);
    expect(() => first.options('upload', new FormData(), 1)).toThrow(TypeError);
  });
});

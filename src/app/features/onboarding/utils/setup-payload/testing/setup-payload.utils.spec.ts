import { setupPayloadKey } from '../setup-payload.utils';

describe('setupPayloadKey', () => {
  it('matches the server mailbox normalization and absent default roles', () => {
    expect(setupPayloadKey({ email: ' Person@Example.com ', roleIds: [null] })).toBe(
      setupPayloadKey({ email: 'person@example.com', roleIds: [] }),
    );
    expect(setupPayloadKey({ email: 'Person@example.com', roleIds: ['role-b', 'role-a'] })).toBe(
      setupPayloadKey({ email: 'person@example.com', roleIds: ['role-a', 'role-b'] }),
    );
  });
  it('ignores optional null defaults while retaining meaningful changes', () => {
    expect(setupPayloadKey({ name: 'Acme', slug: undefined })).toBe(
      setupPayloadKey({ slug: null, name: 'Acme' }),
    );
    expect(setupPayloadKey({ name: 'HQ', type: 'site', latitude: 0 })).not.toBe(
      setupPayloadKey({ name: 'HQ', type: 'site' }),
    );
    expect(setupPayloadKey({ name: 'HQ', type: 'site' })).not.toBe(
      setupPayloadKey({ name: 'Warehouse', type: 'site' }),
    );
  });
});

import { describe, expect, it } from 'vitest';
import { createContractValidator, loadOpenApi } from './support/openapi';

describe('Organization legal profile contract', () => {
  const validator = createContractValidator(loadOpenApi());
  const url = '/api/organizations/00000000-0000-4000-8000-000000000001';

  it.each([
    ['legacy settings', { legalName: 'Example organization' }],
    ['partial address', { registeredAddress: { city: 'Paris' } }],
    ['clear address', { registeredAddress: {} }],
    ['unchanged nullable fields', { registeredAddress: null, privacyContactEmail: null }],
    ['clear contact', { privacyContactEmail: '' }],
    ['trimmed contact', { privacyContactEmail: ' privacy@example.com ' }],
    ['contact', { privacyContactEmail: 'privacy@example.com' }],
  ])('accepts %s without rewriting the request', (_name, body) => {
    const original = structuredClone(body);

    expect(() =>
      validator.request('PATCH', url, 'application/merge-patch+json', body),
    ).not.toThrow();
    expect(body).toEqual(original);
  });

  it.each([
    ['line1', 255],
    ['line2', 255],
    ['postalCode', 32],
    ['city', 128],
    ['region', 128],
  ] as const)('accepts %s at its trimmed length limit without rewriting it', (field, limit) => {
    const body = { registeredAddress: { [field]: ` ${'a'.repeat(limit)} ` } };
    const original = structuredClone(body);

    expect(() =>
      validator.request('PATCH', url, 'application/merge-patch+json', body),
    ).not.toThrow();
    expect(body).toEqual(original);
  });

  it.each([
    ['contact type', { privacyContactEmail: 42 }],
    ['address type', { registeredAddress: 'Paris' }],
    ['address component type', { registeredAddress: { city: 42 } }],
  ])('rejects an invalid %s', (_name, body) => {
    expect(() => validator.request('PATCH', url, 'application/merge-patch+json', body)).toThrow();
  });
});

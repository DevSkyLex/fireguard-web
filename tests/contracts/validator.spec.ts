import { describe, expect, it } from 'vitest';
import { createContractValidator, type OpenApiDocument } from './support/openapi';

const document: OpenApiDocument = {
  openapi: '3.2.0',
  paths: {
    '/api/items/{id}': {
      get: {
        responses: {
          '200': {
            content: { 'application/ld+json': { schema: { $ref: '#/components/schemas/Item' } } },
          },
        },
      },
      patch: {
        requestBody: {
          required: true,
          content: {
            'application/merge-patch+json': {
              schema: {
                type: 'object',
                required: ['enabled'],
                properties: { enabled: { type: 'boolean' } },
                additionalProperties: false,
              },
            },
          },
        },
        responses: { '204': {} },
      },
    },
    '/api/items/status': {
      get: {
        responses: { '200': { content: { 'application/json': { schema: { const: 'ready' } } } } },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        required: ['id', 'status', 'createdAt'],
        properties: {
          id: { type: 'string' },
          status: { enum: ['active', 'closed'] },
          createdAt: { type: 'string', format: 'date-time' },
          children: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
          nullable: { type: ['string', 'null'] },
        },
        additionalProperties: false,
      },
    },
  },
};
const valid = { id: 'item-1', status: 'active', createdAt: '2026-09-29T09:00:00Z', nullable: null };

describe('OpenAPI fixture validator', () => {
  it('validates references, nested data, nullable values, query strings and MIME parameters without mutation', () => {
    const body = { ...valid, children: [valid] };
    const original = structuredClone(body);
    createContractValidator(document).response(
      'GET',
      '/api/items/item-1?page=2',
      200,
      'application/ld+json; charset=utf-8',
      body,
    );
    expect(body).toEqual(original);
  });

  it.each([
    ['route', 'GET', '/api/absent', 200, 'application/ld+json', valid],
    ['method', 'DELETE', '/api/items/item-1', 200, 'application/ld+json', valid],
    ['status', 'GET', '/api/items/item-1', 202, 'application/ld+json', valid],
    ['MIME', 'GET', '/api/items/item-1', 200, 'application/json', valid],
    ['missing field', 'GET', '/api/items/item-1', 200, 'application/ld+json', { id: '1' }],
    [
      'enum',
      'GET',
      '/api/items/item-1',
      200,
      'application/ld+json',
      { ...valid, status: 'unknown' },
    ],
    [
      'format',
      'GET',
      '/api/items/item-1',
      200,
      'application/ld+json',
      { ...valid, createdAt: 'yesterday' },
    ],
    ['type', 'GET', '/api/items/item-1', 200, 'application/ld+json', { ...valid, id: 1 }],
    [
      'extra property',
      'GET',
      '/api/items/item-1',
      200,
      'application/ld+json',
      { ...valid, secret: 'fixture' },
    ],
    [
      'nested value',
      'GET',
      '/api/items/item-1',
      200,
      'application/ld+json',
      { ...valid, children: [{ ...valid, status: 'unknown' }] },
    ],
  ] as const)('rejects invalid %s', (_label, method, url, status, mime, body) => {
    expect(() =>
      createContractValidator(document).response(method, url, status, mime, body),
    ).toThrow();
  });

  it('prefers a static route over a parameter template', () => {
    createContractValidator(document).response(
      'GET',
      '/api/items/status',
      200,
      'application/json',
      'ready',
    );
    expect(() =>
      createContractValidator(document).response(
        'GET',
        '/api/items/status',
        200,
        'application/json',
        valid,
      ),
    ).toThrow();
  });

  it('checks request schemas and rejects missing bodies, coercion and bodies on empty responses', () => {
    const validator = createContractValidator(document);
    validator.request('PATCH', '/api/items/1', 'application/merge-patch+json', { enabled: true });
    expect(() =>
      validator.request('PATCH', '/api/items/1', 'application/merge-patch+json', undefined),
    ).toThrow(/missing request body/);
    expect(() =>
      validator.request('PATCH', '/api/items/1', 'application/merge-patch+json', {
        enabled: 'true',
      }),
    ).toThrow();
    validator.response('PATCH', '/api/items/1', 204, '', null);
    expect(() => validator.response('PATCH', '/api/items/1', 204, '', {})).toThrow(/no body/);
  });
});

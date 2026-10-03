import { describe, expect, it } from 'vitest';
import { createContractValidator, type OpenApiDocument } from './support/openapi';

const document: OpenApiDocument = {
  openapi: '3.2.0',
  paths: {
    '/api/items/{id}': {
      get: {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
        ],
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
    '/api/search': {
      get: {
        parameters: [
          {
            name: 'from',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'organization',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'enabled', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'ids[]',
            in: 'query',
            style: 'form',
            explode: true,
            schema: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
          {
            name: 'status[]',
            in: 'query',
            style: 'form',
            explode: true,
            schema: { type: 'array', items: { enum: ['active', 'closed'], type: 'string' } },
          },
        ],
        responses: { '204': {} },
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

  it('validates required query values, formats and exploded arrays from their wire serialization', () => {
    const query =
      '?from=2026-10-02T12%3A00%3A00Z&organization=550e8400-e29b-41d4-a716-446655440000';
    const validator = createContractValidator(document);
    validator.request(
      'GET',
      '/api/search' +
        query +
        '&enabled=false&ids[]=550e8400-e29b-41d4-a716-446655440001&ids[]=550e8400-e29b-41d4-a716-446655440002&status[]=active&status[]=closed',
      '',
      undefined,
    );
    for (const invalid of [
      '/api/search',
      '/api/search?from=yesterday&organization=550e8400-e29b-41d4-a716-446655440000',
      '/api/search' + query + '&enabled=1',
      '/api/search' + query + '&ids[]=not-a-uuid',
      '/api/search' + query + '&status[]=missing',
      '/api/search' + query + '&enabled=true&enabled=false',
      '/api/items/one?page=2.5',
      '/api/items/one?page=0',
      '/api/items/one?page=02',
    ])
      expect(() => validator.request('GET', invalid, '', undefined), invalid).toThrow(/parameter/);
  });

  it('validates the decoded path value instead of accepting any template match', () => {
    const pathDocument: OpenApiDocument = {
      ...document,
      paths: {
        '/api/id/{id}': {
          get: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
              },
            ],
            responses: { '204': {} },
          },
        },
      },
    };
    const validator = createContractValidator(pathDocument);
    validator.request('GET', '/api/id/550e8400-e29b-41d4-a716-446655440000', '', undefined);
    expect(() => validator.request('GET', '/api/id/not-a-uuid', '', undefined)).toThrow(
      /path parameter id/,
    );
    expect(() => validator.request('GET', '/api/id/%20', '', undefined)).toThrow(
      /path parameter id/,
    );
  });

  it('inherits path-item parameters and applies operation parameter overrides', () => {
    const validator = createContractValidator({
      ...document,
      paths: {
        '/api/inherited': {
          parameters: [
            { name: 'page', in: 'query', required: true, schema: { type: 'integer', minimum: 10 } },
          ],
          get: {
            parameters: [
              {
                name: 'page',
                in: 'query',
                required: true,
                schema: { type: 'integer', minimum: 1 },
              },
            ],
            responses: { '204': {} },
          },
          delete: { responses: { '204': {} } },
        },
      },
    });
    validator.request('GET', '/api/inherited?page=1', '', undefined);
    expect(() => validator.request('GET', '/api/inherited', '', undefined)).toThrow(/required/);
    expect(() => validator.request('DELETE', '/api/inherited?page=1', '', undefined)).toThrow(
      /parameter page/,
    );
  });
});

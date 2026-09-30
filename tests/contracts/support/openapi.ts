import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AnySchema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020.js';

interface Media {
  schema?: AnySchema;
}
interface Operation {
  responses: Record<string, { content?: Record<string, Media> }>;
  requestBody?: { required?: boolean; content: Record<string, Media> };
}
export interface OpenApiDocument {
  openapi: string;
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, AnySchema> };
}

export function loadOpenApi(): OpenApiDocument {
  const file =
    process.env['FIREGUARD_OPENAPI_PATH'] ?? resolve('tests/contracts/fixtures/openapi.json');
  return JSON.parse(readFileSync(file, 'utf8')) as OpenApiDocument;
}

function media(content: Record<string, Media>, contentType: string, context: string): Media {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const selected = content[mime] ?? content['*/*'];
  if (!selected) throw new Error(context + ': undocumented content type ' + mime);
  return selected;
}

/** Validate real fixture traffic against a versioned OpenAPI document, without coercion. */
export function createContractValidator(document: OpenApiDocument) {
  if (!/^3\.[12]\./.test(document.openapi))
    throw new Error('Expected an OpenAPI 3.1/3.2 contract.');
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });
  addFormats(ajv);
  ajv.addFormat('iri-reference', (value: string) => {
    if (/\s|\p{Cc}|%(?![\da-f]{2})/iu.test(value)) return false;
    try {
      const reference = new URL(value, 'https://contract.invalid');
      return reference.href.length > 0;
    } catch {
      return false;
    }
  });
  const contractId = 'https://contract.invalid/openapi.json';
  ajv.addSchema({ $id: contractId, components: document.components });
  const cache = new Map<AnySchema, ValidateFunction>();
  function validate(schema: AnySchema, body: unknown, context: string): void {
    let check = cache.get(schema);
    if (!check) {
      check = ajv.compile({
        $id: contractId + '/response-' + cache.size,
        ...(typeof schema === 'boolean' ? { allOf: [schema] } : schema),
        components: document.components,
      });
      cache.set(schema, check);
    }
    if (!check(body))
      throw new Error(
        context + ': ' + ajv.errorsText(check.errors, { separator: '; ', dataVar: 'body' }),
      );
  }
  function operation(method: string, url: string): { operation: Operation; context: string } {
    const pathname = new URL(url, 'https://contract.invalid').pathname;
    const candidates = Object.keys(document.paths)
      .filter((template) => {
        const pattern = template
          .split(/(\{[^}]+\})/)
          .map((segment) =>
            segment.startsWith('{') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .join('');
        return new RegExp('^' + pattern + '$').test(pathname);
      })
      .toSorted((a, b) => Number(a.includes('{')) - Number(b.includes('{')) || b.length - a.length);
    const route = candidates[0];
    if (!route) throw new Error(method + ' ' + pathname + ': route absent from OpenAPI');
    const selected = document.paths[route]?.[method.toLowerCase()];
    if (!selected) throw new Error(method + ' ' + pathname + ': method absent from OpenAPI');
    return { operation: selected, context: method.toUpperCase() + ' ' + pathname };
  }
  return {
    response(
      method: string,
      url: string,
      status: number,
      contentType: string,
      body: unknown,
    ): void {
      const selected = operation(method, url);
      const response =
        selected.operation.responses[String(status)] ??
        selected.operation.responses[String(status).slice(0, 1) + 'XX'] ??
        selected.operation.responses['default'];
      if (!response) throw new Error(selected.context + ': undocumented response status ' + status);
      if (!response.content) {
        if (body !== null && body !== undefined && body !== '')
          throw new Error(selected.context + ': response must have no body');
        return;
      }
      const schema = media(response.content, contentType, selected.context).schema;
      if (!schema) throw new Error(selected.context + ': response has no schema');
      validate(schema, body, selected.context + ' -> ' + status);
    },
    request(method: string, url: string, contentType: string, body: unknown): void {
      const selected = operation(method, url);
      const request = selected.operation.requestBody;
      if (!request) {
        if (body !== undefined && body !== null)
          throw new Error(selected.context + ': undocumented request body');
        return;
      }
      if (body === undefined || body === null) {
        if (request.required) throw new Error(selected.context + ': missing request body');
        return;
      }
      const schema = media(request.content, contentType, selected.context).schema;
      if (!schema) throw new Error(selected.context + ': request has no schema');
      validate(schema, body, selected.context + ' request');
    },
  };
}

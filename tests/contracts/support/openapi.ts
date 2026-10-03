import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AnySchema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import Ajv2020 from 'ajv/dist/2020.js';

interface Media {
  schema?: AnySchema;
}
interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  style?: string;
  explode?: boolean;
  schema?: AnySchema;
}
interface Operation {
  parameters?: Parameter[];
  responses: Record<string, { content?: Record<string, Media> }>;
  requestBody?: { required?: boolean; content: Record<string, Media> };
}
interface PathItem {
  parameters?: Parameter[];
  [method: string]: Operation | Parameter[] | undefined;
}
export interface OpenApiDocument {
  openapi: string;
  paths: Record<string, PathItem>;
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
    const address = new URL(url, 'https://contract.invalid');
    const pathname = address.pathname;
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
    if (!selected || Array.isArray(selected))
      throw new Error(method + ' ' + pathname + ': method absent from OpenAPI');
    const context = method.toUpperCase() + ' ' + pathname;
    const names = [...route.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const captures = new RegExp(
      '^' +
        route
          .split(/(\{[^}]+\})/)
          .map((segment) =>
            segment.startsWith('{') ? '([^/]+)' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .join('') +
        '$',
    ).exec(pathname);
    const pathValues = new Map(
      names.map((name, index) => [name, decodeURIComponent(captures?.[index + 1] ?? '')]),
    );
    const parameters = new Map<string, Parameter>();
    for (const parameter of [
      ...(document.paths[route]?.parameters ?? []),
      ...(selected.parameters ?? []),
    ])
      parameters.set(parameter.in + ':' + parameter.name, parameter);
    for (const parameter of parameters.values()) {
      if (parameter.in !== 'query' && parameter.in !== 'path') continue;
      const values =
        parameter.in === 'query'
          ? address.searchParams.getAll(parameter.name)
          : pathValues.has(parameter.name)
            ? [pathValues.get(parameter.name) ?? '']
            : [];
      const parameterContext = context + ' ' + parameter.in + ' parameter ' + parameter.name;
      if (values.length === 0) {
        if (parameter.required) throw new Error(parameterContext + ': missing required parameter');
        continue;
      }
      const schema = parameter.schema;
      if (!schema || typeof schema === 'boolean')
        throw new Error(parameterContext + ': unsupported parameter schema');
      const style = parameter.style ?? (parameter.in === 'query' ? 'form' : 'simple');
      const explode = parameter.explode ?? parameter.in === 'query';
      function scalar(value: string, type: unknown): string | number | boolean {
        if (type === 'integer') {
          if (!/^-?(?:0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value)))
            throw new Error(parameterContext + ': invalid integer serialization');
          return Number(value);
        }
        if (type === 'boolean') {
          if (value !== 'true' && value !== 'false')
            throw new Error(parameterContext + ': invalid boolean serialization');
          return value === 'true';
        }
        if (type !== 'string') throw new Error(parameterContext + ': unsupported scalar type');
        return value;
      }
      if (schema['type'] === 'array') {
        if (
          parameter.in !== 'query' ||
          style !== 'form' ||
          !explode ||
          !schema['items'] ||
          typeof schema['items'] === 'boolean'
        )
          throw new Error(parameterContext + ': unsupported array serialization');
        validate(
          schema,
          values.map((value) => scalar(value, schema['items']['type'])),
          parameterContext,
        );
      } else {
        if (values.length !== 1 || style !== (parameter.in === 'query' ? 'form' : 'simple'))
          throw new Error(parameterContext + ': invalid scalar serialization');
        validate(schema, scalar(values[0] ?? '', schema['type']), parameterContext);
      }
    }
    return { operation: selected, context };
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

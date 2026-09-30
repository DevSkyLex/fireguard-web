# API fixture contracts

This suite checks the actual hermetic SSR HTTP responses and selected SPA route handlers against the API's exported OpenAPI 3.2 contract. The reference is versioned in `fixtures/openapi.json`, with its source repository and SHA-256 fingerprint in `fixtures/source.json`.

## Commands

Run from the web repository root:

```sh
npm run test:contracts
npm run e2e:harness -- api-contract.spec.ts --project=chromium
npm run test:contracts:drift
```

The first command runs Vitest in Node: reference integrity, all API responses registered by the authenticated SSR stub, real presence regressions, and positive/negative validator cases. The second exercises the real `ApiMock` handlers through Playwright, covering session bootstrap, presence, inbox, collaboration and scoped collections. CI runs both commands in the **API Fixture Contracts** job.

Ajv validates routes, methods, response statuses, MIME types, JSON Schema references, required properties, enums, nested objects and formats. Request bodies are validated for the selected SPA presence writes. Validation never coerces types, inserts defaults or removes properties. Unknown routes, methods and undocumented response schemas fail with the method/path and JSON property diagnostic.

## Updating the API reference

The API owns the contract. Export it there after changing HTTP metadata, then review and synchronize it here:

```sh
# In fireguard-api
php -d memory_limit=1G bin/console api:openapi:export --output=openapi.json

# In fireguard-web
npm run test:contracts:sync
npm run test:contracts:drift
npm run test:contracts
```

The default source is the sibling `../fireguard-api/openapi.json`. Pass another source file as `npm run test:contracts:sync -- /path/to/openapi.json`. A local checkout with the sibling API automatically checks reference equality. CI uses the reviewed, versioned reference and its fingerprint; it does not fetch a moving API branch. Set `FIREGUARD_OPENAPI_PATH` to test against a freshly exported contract in a coordinated integration job.

Both repositories must review the API export and the synchronized web snapshot when their contract changes. CI in the web repository alone cannot discover an unpublished API change. Schema validation enforces the constraints declared by OpenAPI: it does not infer required fields omitted from the source schema, business permissions or runtime server behavior.

## Scope and ownership

- [Validator and negative cases](validator.spec.ts) prevent permissive checks from hiding bad fixtures.
- [SSR fixture contracts](ssr-fixtures.spec.ts) send requests to the real local HTTP stub; they do not call the application API.
- [SPA fixture contracts](../e2e/harness/api-contract.spec.ts) exercise browser route interception with the hermetic safety net.
- [Architecture suite](../architecture/README.md) checks imports, exports, ownership and execution cycles.

The bounded contract suite complements API functional tests and application E2E. Add a SPA contract case when introducing another fixture family; existing empty collection cases do not validate every populated entity factory.

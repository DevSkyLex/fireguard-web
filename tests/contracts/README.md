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

Ajv validates routes, methods, response statuses, MIME types, JSON Schema references, required properties, enums, nested objects and formats. Path and query parameters enforce required values, scalar types, formats and wire serialization, including repeated `ids[]`/`status[]` form arrays. Integer/boolean wire values are decoded explicitly; body validation never coerces types, inserts defaults or removes properties. Unsupported parameter encodings fail explicitly. Request bodies are validated for the selected SPA presence writes.

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

The default source is the sibling `../fireguard-api/openapi.json`. Pass another source file as `npm run test:contracts:sync -- /path/to/openapi.json`. A local checkout automatically checks reference equality. After publishing the API commit, record its verified full SHA with `npm run test:contracts:sync -- --commit <40-character-API-SHA>`. The synchronizer reads `git show <SHA>:openapi.json` from the source checkout and rejects a content mismatch before updating either artifact. A synchronization without `--commit` preserves an existing verified revision only when the source digest and previous snapshot still match; a changed export loses its obsolete revision and needs a newly verified commit.

CI exclusively resolves the API revision from the reviewed `commit` in `fixtures/source.json`. The contracts job checks out that exact revision and compares its export with the committed snapshot's SHA-256 digest. Missing provenance and mismatches fail the job. Each pull request, develop and main revision therefore owns its API dependency; a mutable repository variable, moving branch or PR identifier cannot override it. For a private API repository, configure the read-only `API_CONTRACT_READ_TOKEN` secret with access to that repository; otherwise the checkout uses `github.token`. Credentials are not persisted, and the API checkout only supplies the exported JSON. Fork pull requests without private-repository access fail this gate rather than substituting a moving or unverified contract.

Set `FIREGUARD_OPENAPI_PATH` to test against a freshly exported contract locally. Uncommitted API exports have a content digest but cannot honestly claim a commit; publish/review the API commit before recording the CI reference.

Both repositories must review the API export and the synchronized web snapshot when their contract changes. CI in the web repository alone cannot discover an unpublished API change. Schema validation enforces the constraints declared by OpenAPI: it does not infer required fields omitted from the source schema, business permissions or runtime server behavior.

## Scope and ownership

- [Validator and negative cases](validator.spec.ts) prevent permissive checks from hiding bad fixtures.
- [SSR fixture contracts](ssr-fixtures.spec.ts) send requests to the real local HTTP stub; they do not call the application API.
- [Populated fixture contracts](populated-fixtures.spec.ts) validate eight collection families, including non-conformities whose nullable deadline, resolution date and notes are omitted.
- [SPA fixture contracts](../e2e/harness/api-contract.spec.ts) exercise browser route interception with the hermetic safety net.
- [Architecture suite](../architecture/README.md) checks imports, exports, ownership and execution cycles.

The bounded contract suite complements API functional tests and application E2E. Add populated cases and actual route-handler checks when introducing another fixture family.

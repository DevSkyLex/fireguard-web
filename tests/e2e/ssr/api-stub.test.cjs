const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const { createApiStub } = require('./api-stub.cjs');
const { E2E_ACCESS_TOKEN } = require('../support/fixtures/api-fixtures.ts');

/** Exercises the stub handler without opening ports or running Angular. */
function invoke(stub, method, url, { body, authenticated = false } = {}) {
  return new Promise((resolve) => {
    const request = new EventEmitter();
    request.method = method;
    request.url = url;
    request.headers = authenticated ? { authorization: 'Bearer ' + E2E_ACCESS_TOKEN } : {};
    request.setEncoding = () => {};
    const response = {
      status: 200,
      setHeader() {},
      writeHead(status) {
        this.status = status;
        return this;
      },
      end(value) {
        resolve({ status: this.status, body: value ? JSON.parse(value) : null });
      },
    };
    stub.handler(request, response);
    if (body !== undefined) {
      request.emit('data', JSON.stringify(body));
      request.emit('end');
    }
  });
}

test('registered SSR fixtures require authentication and the complete exact query', async () => {
  const stub = createApiStub('http://127.0.0.1:4274');
  const path = '/api/organizations/e2e-org-1/inventory-balances';
  const registration = await invoke(stub, 'POST', '/__harness/fixtures', {
    body: {
      fixtures: [
        { method: 'GET', path, query: { page: '1', itemsPerPage: '20' }, body: { member: [] } },
      ],
    },
  });
  assert.deepEqual(registration, { status: 200, body: { registered: 1 } });
  assert.equal((await invoke(stub, 'GET', path + '?page=1&itemsPerPage=20')).status, 501);
  assert.equal(
    (await invoke(stub, 'GET', path + '?itemsPerPage=20&page=1', { authenticated: true })).status,
    200,
  );
  const rejected = await Promise.all(
    ['?page=1', '?page=1&page=1', '?page=1&itemsPerPage=20&warehouseId=other'].map((query) =>
      invoke(stub, 'GET', path + query, { authenticated: true }),
    ),
  );
  for (const response of rejected) assert.equal(response.status, 501);
  assert.equal(stub.unexpected.length, 4);
});

test('fixture replacement is atomic and clearing it does not hide unknown-request evidence', async () => {
  const stub = createApiStub('http://127.0.0.1:4274');
  const path = '/api/organizations/e2e-org-1/service-requests';
  await invoke(stub, 'POST', '/__harness/fixtures', {
    body: { fixtures: [{ method: 'GET', path, body: { private: true } }] },
  });
  assert.equal(
    (
      await invoke(stub, 'POST', '/__harness/fixtures', {
        body: { fixtures: [{ method: 'GET', path: '/api/organizations/other/secret', body: {} }] },
      })
    ).status,
    422,
  );
  assert.equal((await invoke(stub, 'GET', path, { authenticated: true })).status, 200);
  await invoke(stub, 'POST', '/__harness/fixtures', { body: { fixtures: [] } });
  assert.equal((await invoke(stub, 'GET', path, { authenticated: true })).status, 501);
  assert.equal(stub.unexpected.length, 1);
  assert.equal(stub.unexpected[0].path, path);
});

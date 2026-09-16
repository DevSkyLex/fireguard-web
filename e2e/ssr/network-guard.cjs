const http = require('node:http');
const https = require('node:https');
const { syncBuiltinESMExports } = require('node:module');

/**
 * Function assertLocalRequest
 * @description Rejects any SSR HTTP transport outside the two exact harness origins.
 * Reports violations to the owning launcher even if application code catches the failure.
 * @access private
 * @since 1.0.0
 * @param {string} target - Absolute outgoing URL.
 * @returns {void}
 */
function assertLocalRequest(target) {
  const origin = new URL(target).origin;
  if ([process.env.FG_SSR_API_ORIGIN, process.env.FG_SSR_APP_ORIGIN].includes(origin)) return;
  process.send?.({ type: 'FG_SSR_EXTERNAL_REQUEST', origin });
  throw new Error(`Hermetic SSR safety net rejected ${origin}.`);
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  assertLocalRequest(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  return originalFetch(input, init);
};

for (const [transport, protocol] of [
  [http, 'http:'],
  [https, 'https:'],
]) {
  for (const method of ['request', 'get']) {
    const original = transport[method];
    transport[method] = function guardedRequest(input, ...args) {
      const target =
        typeof input === 'string' || input instanceof URL
          ? String(input)
          : `${input.protocol ?? protocol}//${input.hostname ?? input.host ?? 'localhost'}${input.port ? `:${input.port}` : ''}${input.path ?? '/'}`;
      assertLocalRequest(target);
      return original.call(this, input, ...args);
    };
  }
}
syncBuiltinESMExports();

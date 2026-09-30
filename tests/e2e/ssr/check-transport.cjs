const assert = require('node:assert/strict');
const https = require('node:https');

/**
 * Function main
 * @description Verifies local TLS trust and both egress guards without loading the Angular build.
 * @access private
 * @since 1.0.0
 * @returns {Promise<void>} Local requests succeed and external targets are rejected before connection.
 */
async function main() {
  const response = await fetch(`${process.env.FG_SSR_API_ORIGIN}/api/auth/refresh`, {
    method: 'POST',
  });
  assert.equal(response.status, 401);
  await new Promise((done, reject) => {
    https
      .get(`${process.env.FG_SSR_API_ORIGIN}/api/auth/federated/providers`, (result) => {
        assert.equal(result.statusCode, 200);
        result.resume();
        result.on('end', done);
      })
      .on('error', reject);
  });
  assert.throws(() => fetch('https://example.invalid/api/auth/refresh'), /Hermetic SSR safety net/);
  assert.throws(
    () => https.get('https://example.invalid/api/auth/refresh'),
    /Hermetic SSR safety net/,
  );
  process.stdout.write(
    'SSR transport check passed: local TLS fetch + HTTPS GET; external fetch + HTTPS rejected. No Angular execution.\n',
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});

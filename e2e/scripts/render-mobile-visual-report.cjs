const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
require('./register-typescript.cjs');

/**
 * Function main
 * @description Repairs static galleries from a finished run's results and existing PNGs.
 * Compiles only the local reporter; never starts an Angular server or executes a test.
 * @access private
 * @since 1.0.0
 * @returns {Promise<void>} Contact sheets regenerated without recapturing the application.
 */
async function main() {
  const run = process.argv[2] ?? 'inspection';
  if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Use a simple existing run directory name.');
  process.env.FG_VISUAL_RUN = run;
  const root = resolve(__dirname, '../..');
  process.chdir(root);
  const directory =
    process.argv[3] === '--legacy'
      ? resolve('e2e/artifacts/mobile-visual-review', run)
      : resolve('e2e/artifacts/mobile-visual-review/branch-review', run);
  const results = JSON.parse(readFileSync(resolve(directory, 'results.json'), 'utf8'));
  process.env.FG_VISUAL_PASS = results.pass ?? 'inspection';
  const Reporter = require('../support/helpers/mobile-visual-reporter.ts').default;
  const reporter = new Reporter({
    directory,
    source: results.source ?? undefined,
    sourceEnd: results.sourceEnd ?? undefined,
  });
  for (const row of results.tests) {
    reporter.onTestEnd(
      { titlePath: () => [row.name] },
      {
        status: row.status,
        attachments: row.evidence ? [{ name: 'route-evidence', path: row.evidence }] : [],
        errors: row.errors.map((message) => ({ message })),
      },
    );
  }
  const outcome = await reporter.onEnd({ status: results.testStatus ?? results.status });
  if (outcome?.status === 'failed')
    throw new Error(
      'Harness evidence/report generation failed. See results.json; recorded product test outcomes are unchanged.',
    );
  process.stdout.write(
    `Regenerated static contact sheets for ${results.tests.length} recorded cases. No tests executed.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});

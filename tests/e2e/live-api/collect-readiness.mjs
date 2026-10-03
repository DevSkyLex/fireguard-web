import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

/** Executes bounded read-only probes; command output and inherited credentials are never saved. */
function run(command, name) {
  if (
    !Array.isArray(command) ||
    command.length === 0 ||
    command.some((arg) => typeof arg !== 'string')
  ) {
    throw new Error(`Expected an executable/argument array for ${name}.`);
  }
  const result = spawnSync(command[0], command.slice(1), {
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
    shell: false,
  });
  if (result.error || result.status !== 0) throw new Error(`Readiness probe failed: ${name}.`);
  return result.stdout.trim();
}

const [planPath, outputPath] = process.argv.slice(2);
if (!planPath || !outputPath)
  throw new Error('Usage: collect-readiness.mjs <plan.json> <evidence.json>');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
if (!/^[a-z0-9_]{4,64}$/.test(plan.runId)) throw new Error('Invalid isolated run ID.');
for (const name of ['auth', 'main']) {
  const expected = plan.databases?.[name];
  if (
    typeof expected !== 'string' ||
    !/_(test|e2e|live)_/.test(expected) ||
    !expected.includes(plan.runId)
  ) {
    throw new Error(`Database ${name} must be disposable and scoped to this run.`);
  }
  if (run(plan.databaseCommands?.[name], `${name}-database-identity`) !== expected) {
    throw new Error(`Actual ${name} database does not match the isolated plan.`);
  }
}
if (plan.databases.auth === plan.databases.main)
  throw new Error('Auth and main databases must be separate.');
const probes = {};
const requiredArguments = {
  'auth-migrations': [
    'doctrine:migrations:up-to-date',
    '--configuration=config/migrations/auth.yaml',
  ],
  'main-migrations': [
    'doctrine:migrations:up-to-date',
    '--configuration=config/migrations/main.yaml',
  ],
  'auth-worker': ['bin/worker-health.php'],
  'main-worker': ['bin/worker-health.php'],
  'worker-queues': ['app:workers:queues'],
};
for (const name of [
  'auth-migrations',
  'main-migrations',
  'auth-worker',
  'main-worker',
  'worker-queues',
]) {
  if (!requiredArguments[name].every((argument) => plan.probes?.[name]?.includes(argument))) {
    throw new Error(`Probe plan does not execute the required check: ${name}.`);
  }
  run(plan.probes?.[name], name);
  // Probe names describe fixed checks. Omit argv because a runner may pass credentials through it.
  probes[name] = { command: `isolated-stack ${name}`, exitCode: 0 };
}
for (const key of ['webUrl', 'apiUrl', 'mercureUrl']) {
  const url = new URL(plan[key]);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Expected credential-free trusted HTTPS URL.');
  plan[key] = url.href;
}
await writeFile(
  outputPath,
  JSON.stringify(
    {
      version: 1,
      runId: plan.runId,
      isolated: true,
      checkedAt: new Date().toISOString(),
      webUrl: plan.webUrl,
      apiUrl: plan.apiUrl,
      mercureUrl: plan.mercureUrl,
      databases: plan.databases,
      probes,
    },
    null,
    2,
  ) + '\n',
);

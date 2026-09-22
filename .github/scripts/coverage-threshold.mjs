import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SUMMARY = 'coverage/fireguard-web/coverage-summary.json';
const DEFAULT_WORKSPACE = 'angular.json';

function parseJsonFile(path, label, readFile = readFileSync) {
  let contents;
  try {
    contents = readFile(path, 'utf8');
  } catch {
    throw new Error(`${label} is missing or unreadable`);
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function evaluateCoverage(summary, workspace) {
  const lines = summary?.total?.lines;
  const covered = lines?.covered;
  const total = lines?.total;
  const minimum =
    workspace?.projects?.['fireguard-web']?.architect?.test?.configurations?.coverage
      ?.coverageThresholds?.lines;

  if (
    !Number.isSafeInteger(covered) ||
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    covered < 0 ||
    covered > total
  ) {
    throw new Error('Coverage summary has invalid or incomplete line totals');
  }
  if (typeof minimum !== 'number' || !Number.isFinite(minimum) || minimum < 0 || minimum > 100) {
    throw new Error('Angular workspace has no valid line coverage threshold');
  }

  const percentage = (100 * covered) / total;
  return { covered, total, percentage, minimum, passes: percentage >= minimum };
}

export function loadCoverage(
  summaryPath = DEFAULT_SUMMARY,
  workspacePath = DEFAULT_WORKSPACE,
  readFile = readFileSync,
) {
  return evaluateCoverage(
    parseJsonFile(summaryPath, 'Coverage summary', readFile),
    parseJsonFile(workspacePath, 'Angular workspace', readFile),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2];
    if (!['--report', '--enforce'].includes(mode))
      throw new Error('Expected --report or --enforce');
    const result = loadCoverage(
      process.env.COVERAGE_SUMMARY_PATH,
      process.env.ANGULAR_WORKSPACE_PATH,
    );
    const detail = `${result.percentage.toFixed(2)}% (${result.covered}/${result.total}); required: ${result.minimum}%`;
    if (mode === '--report') {
      if (!process.env.GITHUB_STEP_SUMMARY) throw new Error('GITHUB_STEP_SUMMARY is required');
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### Frontend coverage\n\nExecutable lines: **${detail}**.\n`,
      );
      process.stdout.write(`Validated frontend coverage: ${detail}\n`);
    } else if (!result.passes) {
      throw new Error(`Frontend line coverage is below the required threshold: ${detail}`);
    } else {
      process.stdout.write(`Frontend line coverage passed: ${detail}\n`);
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Coverage validation failed'}\n`,
    );
    process.exitCode = 1;
  }
}

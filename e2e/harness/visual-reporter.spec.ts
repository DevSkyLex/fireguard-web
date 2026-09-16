import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import MobileVisualReporter from '../support/helpers/mobile-visual-reporter';

for (const scenario of [
  'valid',
  'missing-attachment',
  'missing-image',
  'corrupt-image',
  'empty-captures',
  'undecodable-image',
  'missing-scroll-frame',
  'missing-diagnostic',
] as const) {
  test(`reports ${scenario} evidence without rewriting product test outcomes`, async ({
    page,
  }, info) => {
    const directory = info.outputPath('gallery');
    const routeDirectory = resolve(directory, 'phone', 'route');
    await mkdir(routeDirectory, { recursive: true });
    const image = resolve(routeDirectory, 'capture.png');
    if (scenario === 'valid' || scenario === 'missing-scroll-frame') {
      await page.setContent('<p>Local evidence fixture</p>');
      await page.screenshot({ path: image });
    } else if (scenario === 'corrupt-image') await writeFile(image, 'not an image');
    else if (scenario === 'undecodable-image')
      await writeFile(
        image,
        Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(24)]),
      );
    const evidence = resolve(routeDirectory, 'evidence.json');
    await writeFile(
      evidence,
      JSON.stringify({
        mode: 'phone',
        settled: scenario !== 'missing-diagnostic',
        captures:
          scenario === 'empty-captures' || scenario === 'missing-diagnostic'
            ? []
            : scenario === 'missing-scroll-frame'
              ? [image, resolve(routeDirectory, 'missing-scroll.png')]
              : [image],
        route: { id: 'route', path: '/fixture' },
        scenarios: ['Local fixture captured'],
      }),
    );
    const reporter = new MobileVisualReporter({ directory });
    reporter.onTestEnd(
      { titlePath: () => ['Actual scenario'] } as TestCase,
      {
        status: 'passed',
        errors: [],
        attachments:
          scenario === 'missing-attachment' ? [] : [{ name: 'route-evidence', path: evidence }],
      } as unknown as TestResult,
    );
    const outcome = await reporter.onEnd({ status: 'passed' } as FullResult);
    const report = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'));
    expect(report.testStatus).toBe('passed');
    expect(report.tests[0].status).toBe('passed');
    if (scenario === 'valid') {
      expect(outcome).toBeUndefined();
      expect(report.evidenceStatus).toBe('passed');
      expect(report.tests[0].scenarios).toEqual(['Local fixture captured']);
      expect((await readFile(resolve(directory, 'phone-contact-01.png'))).length).toBeGreaterThan(
        100,
      );
    } else {
      expect(outcome).toEqual({ status: 'failed' });
      expect(report.status).toBe('failed');
      expect(report.evidenceStatus).toBe('failed');
      expect(report.evidenceErrors.join(' ')).toContain(
        'Harness evidence/report generation failed',
      );
    }
  });
}

test('fails report generation when no visual scenarios ran', async ({ browserName }, info) => {
  const reporter = new MobileVisualReporter({ directory: info.outputPath(`empty-${browserName}`) });
  expect(await reporter.onEnd({ status: 'passed' } as FullResult)).toEqual({ status: 'failed' });
});

test('fails visual evidence when authored source changes during capture', async ({
  browserName,
}, info) => {
  void browserName;
  const source = {
    revision: 'a'.repeat(40),
    fingerprint: 'b'.repeat(64),
    dirty: true,
    files: 1,
    scope: ['fixture'],
  };
  const reporter = new MobileVisualReporter({
    directory: info.outputPath('changed-source'),
    source,
    sourceEnd: { ...source, fingerprint: 'c'.repeat(64) },
  });

  expect(await reporter.onEnd({ status: 'passed' } as FullResult)).toEqual({
    status: 'failed',
  });
  const report = JSON.parse(
    await readFile(resolve(info.outputPath('changed-source'), 'results.json'), 'utf8'),
  );
  expect(report.sourceChanged).toBe(true);
  expect(report.evidenceErrors.join(' ')).toContain('Authored source');
});

test('regenerates static reports with original source metadata and fails the CLI for missing images', async ({
  page,
}, info) => {
  const run = `harness-render-${info.project.name}-${process.pid}`;
  const directory = resolve('e2e/artifacts/mobile-visual-review/branch-review', run);
  const routeDirectory = resolve(directory, 'phone', 'fixture');
  await mkdir(routeDirectory, { recursive: true });
  const image = resolve(routeDirectory, 'capture.png');
  const evidence = resolve(routeDirectory, 'evidence.json');
  await page.setContent('<p>Static renderer fixture</p>');
  await page.screenshot({ path: image });
  await writeFile(
    evidence,
    JSON.stringify({
      mode: 'phone',
      settled: true,
      captures: [image],
      route: { id: 'fixture', path: '/fixture' },
      scenarios: ['Synthetic capture'],
    }),
  );
  const source = {
    revision: 'a'.repeat(40),
    fingerprint: 'b'.repeat(64),
    dirty: true,
    files: 1,
    scope: ['fixture'],
  };
  const sourceEnd = { ...source };
  await writeFile(
    resolve(directory, 'results.json'),
    JSON.stringify({
      status: 'passed',
      testStatus: 'passed',
      pass: 'confirmation',
      source,
      sourceEnd,
      tests: [{ name: 'Recorded fixture scenario', status: 'passed', errors: [], evidence }],
    }),
  );
  const output = execFileSync(
    process.execPath,
    ['e2e/scripts/render-mobile-visual-report.cjs', run],
    { encoding: 'utf8', windowsHide: true },
  );
  expect(output).toContain('No tests executed');
  const report = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'));
  expect(report.pass).toBe('confirmation');
  expect(report.source).toEqual(source);
  expect(report.sourceEnd).toEqual(sourceEnd);
  expect(report.sourceChanged).toBe(false);
  await writeFile(
    evidence,
    JSON.stringify({
      mode: 'phone',
      settled: true,
      captures: [resolve(routeDirectory, 'missing.png')],
      route: { id: 'fixture', path: '/fixture' },
    }),
  );
  expect(() =>
    execFileSync(process.execPath, ['e2e/scripts/render-mobile-visual-report.cjs', run], {
      encoding: 'utf8',
      stdio: 'pipe',
      windowsHide: true,
    }),
  ).toThrow();
  const failed = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'));
  expect(failed.testStatus).toBe('passed');
  expect(failed.evidenceStatus).toBe('failed');
});

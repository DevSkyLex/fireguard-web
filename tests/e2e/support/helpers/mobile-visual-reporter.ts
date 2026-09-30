import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { sourceFingerprint, visualRun } from './visual-run';

/**
 * Interface VisualEvidence
 * @interface VisualEvidence
 * @description Completed capture metadata required to render a truthful gallery.
 * @since 1.0.0
 */
interface VisualEvidence {
  mode: string;
  settled: boolean;
  captures: string[];
  scenarios?: string[];
  route: { id: string; path: string; limit?: string };
}

/**
 * Function escapeHtml
 * @description Escapes report text; fixture names never become executable gallery markup.
 * @access private
 * @since 1.0.0
 * @param {string} value - Plain report text.
 * @returns {string} Safe HTML text or attribute value.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Class MobileVisualReporter
 * @class MobileVisualReporter
 * @description Builds durable result names, an original-image gallery and paginated contact
 * sheets from this run's actual attachments. Never recaptures the application or reads stale runs.
 * @since 1.0.0
 */
export default class MobileVisualReporter implements Reporter {
  private readonly rows: {
    name: string;
    status: string;
    evidence?: string;
    scenarios?: string[];
    errors: string[];
  }[] = [];
  private sourceStart: ReturnType<typeof sourceFingerprint> | undefined;

  /**
   * Constructor
   * @constructor
   * @description Allows isolated harness checks and static regeneration of an existing evidence directory.
   * @access public
   * @since 1.0.0
   * @param {{ directory?: string; source?: ReturnType<typeof sourceFingerprint> }} options - Recorded input identity for regeneration.
   */
  public constructor(
    private readonly options: {
      directory?: string;
      source?: ReturnType<typeof sourceFingerprint>;
      sourceEnd?: ReturnType<typeof sourceFingerprint>;
    } = {},
  ) {}

  /**
   * Method onBegin
   * @method onBegin
   * @description Records the revision and authored working tree before any scenario executes.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public onBegin(): void {
    this.sourceStart = sourceFingerprint();
  }

  /**
   * Method onTestEnd
   * @method onTestEnd
   * @description Retains exact result names and this run's evidence paths.
   * @access public
   * @since 1.0.0
   * @param {TestCase} test - Completed test.
   * @param {TestResult} result - Actual status and attachments.
   * @returns {void}
   */
  public onTestEnd(test: TestCase, result: TestResult): void {
    this.rows.push({
      name: test.titlePath().join(' > '),
      status: result.status,
      evidence: result.attachments.find((attachment) => attachment.name === 'route-evidence')?.path,
      errors: result.errors.map((error) => error.message ?? ''),
    });
  }

  /**
   * Method onEnd
   * @method onEnd
   * @description Creates static local image galleries and contact sheets after the bounded run.
   * @access public
   * @since 1.0.0
   * @param {FullResult} result - Actual aggregate runner result.
   * @returns {Promise<void | { status: 'failed' }>} Evidence failures also fail the runner, independently of product assertions.
   */
  public async onEnd(result: FullResult): Promise<void | { status: 'failed' }> {
    const run = visualRun();
    const directory = this.options.directory ?? run.directory;
    await mkdir(directory, { recursive: true });
    const resultsPath = resolve(directory, 'results.json');
    const source = this.options.source ?? this.sourceStart;
    const sourceEnd =
      this.options.sourceEnd ?? (this.sourceStart ? sourceFingerprint() : undefined);
    const sourceChanged =
      source && sourceEnd
        ? source.fingerprint !== sourceEnd.fingerprint || source.revision !== sourceEnd.revision
        : null;
    const report = {
      status: result.status,
      testStatus: result.status,
      evidenceStatus: 'pending',
      evidenceErrors: [] as string[],
      run: run.name,
      pass: run.pass,
      source: source ?? null,
      sourceEnd: sourceEnd ?? null,
      sourceChanged,
      tests: this.rows,
    };
    await writeFile(resultsPath, JSON.stringify(report, null, 2));
    try {
      if (sourceChanged)
        throw new Error('Authored source or Git revision changed during visual evidence capture.');
      if (!this.rows.some((row) => row.status !== 'skipped'))
        throw new Error('No executed visual scenarios were recorded.');
      const groups = new Map<string, string[]>();
      const gallery: string[] = [];
      const expectedImages = new Set<string>();
      /* eslint-disable no-await-in-loop -- Preserve report order while reading one completed test's evidence. */
      for (const row of this.rows) {
        if (row.status === 'skipped') continue;
        if (!row.evidence) throw new Error(`Missing route-evidence for ${row.name}.`);
        const evidence = JSON.parse(await readFile(row.evidence, 'utf8')) as VisualEvidence;
        if (
          !evidence.mode ||
          !evidence.route?.id ||
          !Array.isArray(evidence.captures) ||
          typeof evidence.settled !== 'boolean'
        )
          throw new Error(`Invalid route evidence for ${row.name}.`);
        if (evidence.settled && evidence.captures.length === 0)
          throw new Error(`Missing settled captures for ${row.name}.`);
        row.scenarios = evidence.scenarios ?? [];
        const image =
          evidence.captures[0] ??
          resolve(directory, evidence.mode, evidence.route.id, 'unsettled-diagnostic.png');
        row.evidence = resolve(directory, evidence.mode, evidence.route.id, 'evidence.json');
        await readFile(row.evidence);
        for (const path of [image, ...evidence.captures]) {
          const bytes = await readFile(path);
          if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
            throw new Error(`Invalid expected PNG: ${path}.`);
          expectedImages.add(path);
        }
        const title = `${evidence.route.id} — ${row.status}${evidence.settled ? '' : ' / UNSETTLED'}`;
        const card = `<figure><figcaption>${escapeHtml(title)}</figcaption><a href="${pathToFileURL(image).href}"><img src="${pathToFileURL(image).href}" alt="${escapeHtml(title)}"></a><small>${escapeHtml(evidence.route.path)}</small></figure>`;
        const group = groups.get(evidence.mode) ?? [];
        group.push(card);
        groups.set(evidence.mode, group);
        gallery.push(
          `<section><h2>${escapeHtml(evidence.mode)} / ${escapeHtml(title)}</h2><p>${escapeHtml(evidence.route.limit ?? 'Existing populated fixture data; no create or submit actions.')}</p><a href="${pathToFileURL(row.evidence).href}">Request and source evidence</a><div class="grid">${evidence.captures.map((path, index) => `<figure><figcaption>Scroll frame ${index}</figcaption><a href="${pathToFileURL(path).href}"><img src="${pathToFileURL(path).href}" alt="Scroll frame ${index}"></a></figure>`).join('')}</div></section>`,
        );
      }
      /* eslint-enable no-await-in-loop */
      await writeFile(resultsPath, JSON.stringify(report, null, 2));
      const style =
        '<style>body{font:14px system-ui;margin:24px;background:#eee;color:#171717}h1{font-size:22px}h2{font-size:18px}.grid{display:grid;grid-template-columns:repeat(3,310px);gap:18px}figure{margin:0;padding:8px;background:white;border:1px solid #bbb;overflow:hidden}figcaption{font-weight:600;min-height:38px}img{display:block;width:292px;height:632px;object-fit:contain;object-position:top}small{display:block;overflow-wrap:anywhere}section{margin:32px 0}</style>';
      await writeFile(
        resolve(directory, 'index.html'),
        `<!doctype html><meta charset="utf-8"><title>Mobile visual review</title>${style}<h1>Mobile visual review — ${escapeHtml(result.status)}</h1><p>Original settled captures and limits. Passing geometry checks still require human visual inspection. Results: <a href="results.json">exact test names</a>.</p>${gallery.join('')}`,
      );
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({
          viewport: { width: 1032, height: 900 },
          deviceScaleFactor: 1,
        });
        /* eslint-disable no-await-in-loop -- Decode one original at a time to bound image memory on large galleries. */
        for (const path of expectedImages) {
          const data = await readFile(path);
          await page
            .evaluate(
              async (imageSource) => {
                const image = new Image();
                image.src = imageSource;
                await image.decode();
                if (!image.naturalWidth || !image.naturalHeight)
                  throw new Error('Expected image decoded with no dimensions.');
              },
              `data:image/png;base64,${data.toString('base64')}`,
            )
            .catch((error: unknown) => {
              throw new Error(`Unable to decode expected image ${path}: ${String(error)}`);
            });
        }
        /* eslint-enable no-await-in-loop */
        /* eslint-disable no-await-in-loop -- One local gallery page renders each contact sheet sequentially; no application rerun. */
        for (const [mode, cards] of groups) {
          for (let offset = 0; offset < cards.length; offset += 9) {
            const stem = `${mode}-contact-${String(offset / 9 + 1).padStart(2, '0')}`;
            const htmlPath = resolve(directory, `${stem}.html`);
            await writeFile(
              htmlPath,
              `<!doctype html><meta charset="utf-8">${style}<h1>${escapeHtml(mode)} — ${escapeHtml(result.status)}</h1><div class="grid">${cards.slice(offset, offset + 9).join('')}</div>`,
            );
            await page.goto(pathToFileURL(htmlPath).href);
            await page.evaluate(async () => {
              await Promise.all(
                [...document.images].map(async (image) => {
                  await image.decode();
                  if (!image.naturalWidth || !image.naturalHeight)
                    throw new Error(`Expected gallery image is empty: ${image.src}`);
                }),
              );
            });
            await page.screenshot({
              path: resolve(directory, `${stem}.png`),
              fullPage: true,
              animations: 'disabled',
            });
          }
        }
        /* eslint-enable no-await-in-loop */
      } finally {
        await browser.close();
      }
      report.evidenceStatus = 'passed';
    } catch (error) {
      report.status = 'failed';
      report.evidenceStatus = 'failed';
      report.evidenceErrors.push(`Harness evidence/report generation failed: ${String(error)}`);
      await writeFile(
        resolve(directory, 'index.html'),
        `<!doctype html><meta charset="utf-8"><h1>Evidence generation failed</h1><p>${escapeHtml(report.evidenceErrors.join('\n'))}</p><p>Recorded test outcomes are unchanged; this is not a product defect classification.</p>`,
      );
    }
    await writeFile(resultsPath, JSON.stringify(report, null, 2));
    if (report.evidenceStatus === 'failed') return { status: 'failed' };
  }
}

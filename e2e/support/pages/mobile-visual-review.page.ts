import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ROLE_ID } from '../fixtures/role-fixtures';
import { criticalVisibility } from '../helpers/critical-visibility';
import { MOBILE_VISUAL_ROUTES, type MobileVisualRoute } from '../helpers/mobile-visual-matrix';
import { visualRun } from '../helpers/visual-run';

/**
 * Interface VisualMode
 * @interface VisualMode
 * @description Capture identity and expected independent device/theme state.
 * @since 1.0.0
 */
interface VisualMode {
  readonly name: string;
  readonly mobile: boolean;
  readonly theme: 'light' | 'dark';
}

/**
 * Class MobileVisualReviewPage
 * @class MobileVisualReviewPage
 * @description Visits one route, records settled pixels at every main-content scroll position,
 * and measures clipping and navigation clearance. Captures survive disposable runner output.
 * @since 1.0.0
 */
export class MobileVisualReviewPage {
  /**
   * Constructor
   * @constructor
   * @description Binds the isolated page without navigating or registering mocks.
   * @access public
   * @since 1.0.0
   * @param {Page} page - Browser page owned by one test.
   */
  public constructor(private readonly page: Page) {}

  public readonly content = this.page.locator('#dashboard-content');
  public readonly navigation = this.page.locator('#organization-mobile-navigation');

  /**
   * Method inspect
   * @method inspect
   * @description Captures before soft layout assertions so a regression retains reviewable evidence.
   * Failed readiness retains a separately labeled diagnostic image, never a settled capture claim.
   * @access public
   * @since 1.0.0
   * @param {MobileVisualRoute} route - Source-backed route and endpoint expectation.
   * @param {VisualMode} mode - Expected device and theme.
   * @param {TestInfo} info - Attachment and test identity.
   * @returns {Promise<void>} Captures, request ledger and geometry evidence written.
   */
  public async inspect(route: MobileVisualRoute, mode: VisualMode, info: TestInfo): Promise<void> {
    const run = visualRun();
    const directory = resolve(run.directory, mode.name, route.id);
    await mkdir(directory, { recursive: true });
    const responses: { method: string; path: string; status: number }[] = [];
    const errors: string[] = [];
    const captures: string[] = [];
    const scenarios: string[] = [];
    const probes: { action: string; visible: boolean; failures: string[] }[] = [];
    let settled = false;
    let capturedUrl = '';
    this.page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/api/'))
        responses.push({
          method: response.request().method(),
          path: url.pathname,
          status: response.status(),
        });
    });
    this.page.on('pageerror', (error) => errors.push(error.message));
    this.page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      await this.page.goto(route.path);
      if (route.openForm) {
        await expect(this.page.locator('#interventions')).toBeVisible();
        await this.page.getByTestId('interventions-new').click();
      }
      await expect(this.page.locator(route.root).first()).toBeVisible();
      await expect(this.page).toHaveURL(new URL(route.path, this.page.url()).href);
      if (route.endpoint)
        await expect
          .poll(() =>
            responses.some(
              (response) => response.path === route.endpoint && response.status === 200,
            ),
          )
          .toBe(true);
      await this.page.waitForLoadState('networkidle');
      await expect(
        this.page.locator('vite-error-overlay'),
        'The harness server must have a successful build.',
      ).toHaveCount(0);
      await expect(
        this.page.locator('[data-slot="skeleton"]:visible, [data-slot="spinner"]:visible'),
      ).toHaveCount(0);
      if (route.text) await expect(this.page.locator(route.root).first()).toContainText(route.text);
      if (route.id === 'settings')
        await expect(this.page.getByTestId('org-settings-name')).toHaveValue('E2E Organization');
      await this.page.evaluate(async () => {
        await document.fonts.ready;
      });
      await expect(this.page.locator('html')).toHaveAttribute(
        'data-interaction-mode',
        mode.mobile ? 'mobile' : 'desktop',
      );
      await expect(this.page.locator('html')).toHaveAttribute('data-theme', mode.theme);
      settled = true;
      capturedUrl = this.page.url();
      scenarios.push('Settled route, primary API read, device classification and theme');

      // Internal shell scrolling is not included by Playwright's fullPage screenshot.
      // Each sweep uses its own scroll owner; a form's scroll body is separate from the shell.
      const scrollSelector = route.openForm
        ? '[data-testid="intervention-create-sheet"]'
        : '#dashboard-content';
      const scrollOwner = this.page.locator(scrollSelector);
      const scroll = await scrollOwner.evaluate((root) => {
        const candidates = [root, ...root.querySelectorAll('*')].filter((element) => {
          const style = getComputedStyle(element);
          return /(auto|scroll)/.test(style.overflowY) && element.clientHeight > 80;
        });
        const owner =
          candidates.toSorted(
            (a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
          )[0] ?? root;
        owner.setAttribute('data-visual-scroll-owner', 'true');
        return {
          max: owner.scrollHeight - owner.clientHeight,
          step: Math.max(200, owner.clientHeight - 64),
        };
      });
      const positions = [0];
      for (let offset = scroll.step; offset < scroll.max; offset += scroll.step)
        positions.push(offset);
      if (scroll.max > 1) positions.push(scroll.max);
      expect
        .soft(
          positions.length,
          'Bounded capture sweep must cover the whole scroll owner in at most 10 frames.',
        )
        .toBeLessThanOrEqual(10);
      /* eslint-disable no-await-in-loop -- Scroll, settle and capture each position sequentially on one page. */
      for (const [index, offset] of positions.slice(0, 10).entries()) {
        await this.page.locator('[data-visual-scroll-owner="true"]').evaluate((element, top) => {
          element.scrollTop = top;
        }, offset);
        await this.page.evaluate(
          () =>
            new Promise<void>((done) =>
              requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
        );
        const path = resolve(
          directory,
          `${String(index).padStart(2, '0')}-${index === 0 ? 'top' : index === positions.length - 1 ? 'bottom' : 'scroll'}.png`,
        );
        await this.page.screenshot({ path, animations: 'disabled', caret: 'hide' });
        captures.push(path);
        await expect(
          this.page.locator('vite-error-overlay'),
          'A rebuild error overlay invalidates visual evidence.',
        ).toHaveCount(0);
        await info.attach(`${mode.name}-${route.id}-${index}`, {
          path,
          contentType: 'image/png',
        });
      }
      /* eslint-enable no-await-in-loop */
      scenarios.push(`Main scroll owner: ${captures.length} viewport frames`);

      if (route.id === 'equipment' && mode.mobile) {
        const toggle = this.page.getByTestId('equipment-kpi-statistics-toggle');
        await expect.soft(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(this.page.getByTestId('equipment-kpi-statistics-content')).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await this.content.evaluate((element) => {
          element.scrollTop = 0;
        });
        const path = resolve(directory, 'statistics-expanded.png');
        await this.page.screenshot({ path, animations: 'disabled', caret: 'hide' });
        captures.push(path);
        await info.attach(`${mode.name}-equipment-statistics-expanded`, {
          path,
          contentType: 'image/png',
        });
        scenarios.push('Equipment statistics disclosure expanded');
      }

      if (route.id === 'members' && mode.mobile) {
        const trigger = this.page.getByTestId('organization-members-role-filter-mobile');
        await expect(trigger, 'The role filter must project into the toolbar.').toBeVisible();
        await trigger.click();
        const drawer = this.page.getByTestId('organization-members-role-drawer');
        await expect(drawer).toBeVisible();
        const option = drawer.getByTestId(`organization-members-role-mobile-${E2E_ROLE_ID}`);
        await expect(option).toContainText('Inspector');
        const openPath = resolve(directory, 'role-filter-open.png');
        await this.page.screenshot({ path: openPath, animations: 'disabled', caret: 'hide' });
        captures.push(openPath);
        await info.attach(`${mode.name}-members-role-filter-open`, {
          path: openPath,
          contentType: 'image/png',
        });
        const filteredRead = this.page.waitForResponse((response) => {
          const url = new URL(response.url());
          return (
            url.pathname.endsWith('/members') &&
            url.searchParams.get('roleId') === E2E_ROLE_ID &&
            response.request().method() === 'GET' &&
            response.status() === 200
          );
        });
        await option.click();
        await filteredRead;
        await expect(drawer).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect(trigger).toContainText('Inspector');
        await expect(this.page).toHaveURL(new RegExp(`roleId=${E2E_ROLE_ID}`));
        const cards = this.page.getByTestId('organization-member-table-row-card');
        await expect(cards).toHaveCount(1);
        await expect(cards.first()).toContainText('Ines Pector');
        const filteredPath = resolve(directory, 'role-filter-inspector.png');
        await this.page.screenshot({ path: filteredPath, animations: 'disabled', caret: 'hide' });
        captures.push(filteredPath);
        await info.attach(`${mode.name}-members-role-filter-inspector`, {
          path: filteredPath,
          contentType: 'image/png',
        });
        scenarios.push('Member role drawer selection, close, focus restoration and filtered GET');
      }

      const geometry = await this.page.evaluate(() => {
        // eslint-disable-next-line unicorn/consistent-function-scoping -- Must remain inside the serialized browser evaluation.
        const box = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        };
        const containers = [
          ...document.querySelectorAll('#dashboard-content [data-slot="table-container"]'),
        ].filter((element) => element.getBoundingClientRect().height > 0);
        return {
          documentWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          content: box('#dashboard-content'),
          navigation: box('#organization-mobile-navigation'),
          tables: containers.map((element) => ({
            width: element.clientWidth,
            scrollWidth: element.scrollWidth,
          })),
          links: [
            ...document.querySelectorAll<HTMLAnchorElement>(
              '#organization-mobile-navigation a, #organization-more-page a[data-destination]',
            ),
          ].map((link) => ({
            href: link.getAttribute('href'),
            label: link.textContent?.trim(),
            height: link.getBoundingClientRect().height,
          })),
        };
      });
      await writeFile(resolve(directory, 'geometry.json'), JSON.stringify(geometry, null, 2));
      expect
        .soft(geometry.documentScrollWidth, 'Document horizontal clipping.')
        .toBeLessThanOrEqual(geometry.documentWidth + 1);
      if (mode.mobile) {
        await expect.soft(this.navigation).toBeInViewport();
        await expect.soft(this.page.getByTestId('dashboard-sidebar-trigger')).toHaveCount(0);
        if (geometry.navigation && geometry.content)
          expect
            .soft(geometry.content.bottom, 'Main scroll region clears bottom navigation.')
            .toBeLessThanOrEqual(geometry.navigation.y + 1);
        for (const link of geometry.links)
          expect.soft(link.height, `Touch target ${link.label}`).toBeGreaterThanOrEqual(44);
        if ((this.page.viewportSize()?.width ?? 0) < 600) {
          for (const table of geometry.tables)
            expect
              .soft(table.scrollWidth, 'Phone table must not hide unread columns.')
              .toBeLessThanOrEqual(table.width + 1);
        }
      } else await expect.soft(this.navigation).toHaveCount(0);
      if (route.id === 'home') {
        const values = this.page.locator('app-stat-tile [data-slot="card-title"] > span');
        await expect(values).toHaveCount(4);
        const sizes = await values.evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).fontSize),
        );
        expect
          .soft(sizes, 'Rendered KPI child values retain their 24px hierarchy.')
          .toEqual(['24px', '24px', '24px', '24px']);
        scenarios.push('Computed KPI value font size: 24px on each card title child span');
      }
      if (route.id === 'more') {
        const covered = new Set(MOBILE_VISUAL_ROUTES.map((entry) => entry.path));
        for (const link of geometry.links)
          if (link.href)
            expect
              .soft(
                covered.has(link.href),
                `Reachable destination lacks a route capture: ${link.href}`,
              )
              .toBe(true);
      }
      if (route.openForm) {
        const submitProbe = await criticalVisibility(
          this.page.getByTestId('intervention-create-submit'),
        );
        probes.push({ action: 'intervention-create-submit', ...submitProbe });
        expect
          .soft(submitProbe.failures, 'Submit must fit fully and remain unobscured.')
          .toEqual([]);
        scenarios.push('Creation sheet full submit bounds, hit testing, field bounds and focus');
        const fieldBounds = await this.page.getByTestId('intervention-create-name').boundingBox();
        expect
          .soft(fieldBounds?.x, 'Intervention sheet fields stay inside the left viewport edge.')
          .toBeGreaterThanOrEqual(0);
        if (fieldBounds)
          expect
            .soft(
              fieldBounds.x + fieldBounds.width,
              'Intervention sheet fields stay inside the right viewport edge.',
            )
            .toBeLessThanOrEqual(geometry.documentWidth);
        const focusInside = await this.page
          .locator(route.root)
          .evaluate((element) => element.contains(document.activeElement));
        expect
          .soft(focusInside, 'Opening a sheet moves keyboard focus into the active surface.')
          .toBe(true);
      }
      if (route.id === 'imports' && mode.mobile) {
        const card = this.page.getByTestId('import-job-table-card').first();
        await card.scrollIntoViewIfNeeded();
        await expect
          .soft(card, 'A populated import job must remain readable below the upload form.')
          .toBeInViewport({ ratio: 0.95 });
      }
      if (route.id === 'direct-conversation') {
        const composer = await this.page.getByTestId('message-composer-input').boundingBox();
        expect
          .soft(
            composer?.width,
            'The conversation composer must not collapse beside its list in a narrow desktop window.',
          )
          .toBeGreaterThanOrEqual(260);
        if (!mode.mobile && geometry.documentWidth < 600) {
          expect
            .soft(
              geometry.content?.width,
              'Narrow desktop conversation owns the available content width.',
            )
            .toBeGreaterThanOrEqual(geometry.documentWidth - 1);
          const sidebar = this.page.getByTestId('dashboard-sidebar-trigger');
          await expect.soft(sidebar).toBeVisible();
          expect
            .soft(
              (await sidebar.boundingBox())?.height,
              'Desktop toolbar keeps native compact controls.',
            )
            .toBeLessThan(44);
          await this.page.getByTestId('direct-conversation-back').click();
          await expect.soft(this.page).toHaveURL(/\/messages$/);
          await expect
            .soft(this.page.getByTestId('direct-messages-panel-row').first())
            .toBeInViewport();
          await expect
            .soft(this.page.locator('html'))
            .toHaveAttribute('data-interaction-mode', 'desktop');
          await expect.soft(this.navigation).toHaveCount(0);
        }
      }
      expect
        .soft(
          responses.filter((response) => response.status >= 400),
          'Unmocked or failed API reads are harness gaps, not product visual defects.',
        )
        .toEqual([]);
      expect.soft(errors, 'Browser errors.').toEqual([]);
    } finally {
      if (!settled) {
        const path = resolve(directory, 'unsettled-diagnostic.png');
        await this.page.screenshot({ path, animations: 'disabled' }).catch(() => undefined);
      }
      const evidence = {
        run: run.name,
        pass: run.pass,
        route,
        mode: mode.name,
        viewport: this.page.viewportSize(),
        url: capturedUrl || this.page.url(),
        finalUrl: this.page.url(),
        settled,
        captures,
        scenarios,
        probes,
        responses,
        errors,
        test: info.titlePath,
        source: 'e2e/support/helpers/mobile-visual-matrix.ts',
      };
      const path = resolve(directory, 'evidence.json');
      await writeFile(path, JSON.stringify(evidence, null, 2));
      await info.attach('route-evidence', { path, contentType: 'application/json' });
    }
  }
}

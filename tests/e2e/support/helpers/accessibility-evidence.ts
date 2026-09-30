import { mkdir, writeFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';

interface AccessibleNode {
  readonly role?: { readonly value?: string };
  readonly name?: { readonly value?: string };
  readonly description?: { readonly value?: string };
  readonly properties?: readonly {
    readonly name: string;
    readonly value: { readonly value?: unknown };
  }[];
}

const evidenceDirectory = 'tests/e2e/artifacts/accessibility';

/** Reads the rendered element's Chromium accessibility node through the public CDP API. */
async function accessibleNode(page: Page, target: Locator): Promise<AccessibleNode> {
  const selector = await target.evaluate((element) => {
    const parts: string[] = [];
    let current: Element | null = element;
    while (current) {
      const index = current.parentElement
        ? Array.from(current.parentElement.children).indexOf(current) + 1
        : 1;
      parts.unshift(`${current.localName}:nth-child(${index})`);
      current = current.parentElement;
    }
    return parts.join(' > ');
  });
  const session = await page.context().newCDPSession(page);
  try {
    const document = await session.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: document.root.nodeId,
      selector,
    });
    const { node } = await session.send('DOM.describeNode', { nodeId });
    const tree = await session.send('Accessibility.getPartialAXTree', {
      backendNodeId: node.backendNodeId,
      fetchRelatives: false,
    });
    return tree.nodes[0] as AccessibleNode;
  } finally {
    await session.detach();
  }
}

/** Persists the actual DOM, accessibility node and screenshot outside disposable test output. */
async function captureEvidence(
  page: Page,
  target: Locator,
  name: string,
): Promise<AccessibleNode | null> {
  const engine = page.context().browser()?.browserType().name();
  const node = engine === 'chromium' ? await accessibleNode(page, target) : null;
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    `${evidenceDirectory}/${name}.json`,
    JSON.stringify(
      {
        engine,
        url: page.url(),
        html: await target.evaluate((el) => el.outerHTML),
        accessibility: await target.ariaSnapshot(),
        node,
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: `${evidenceDirectory}/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  return node;
}

/**
 * Verifies a supplemental disclosure remains keyboard reachable, described and dismissible.
 * @param page - Chromium page rendering the real Angular component.
 * @param target - Timestamp or contextual detail disclosure.
 * @param name - Stable name for the retained browser evidence.
 * @returns Resolves after focus, accessibility and Escape checks pass.
 */
export async function expectAccessibleTooltip(
  page: Page,
  target: Locator,
  name: string,
): Promise<void> {
  await expect(target).toBeVisible();
  await expect(target).toHaveAttribute('tabindex', '0');
  await target.focus();
  await page.keyboard.press('Tab');
  await expect(target).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(target).toBeFocused();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveAttribute('id', /.+/);
  const tooltipId = await tooltip.getAttribute('id');
  if (!tooltipId) throw new Error('The tooltip must expose an id for its accessible description');
  await expect(target).toHaveAttribute('aria-describedby', tooltipId);
  const details = (await tooltip.innerText()).trim();
  expect(details.length).toBeGreaterThan(0);
  const node = await captureEvidence(page, target, name);
  if (node) {
    expect(node.description?.value).toBe(details);
    expect(node.role?.value).not.toBe('button');
  }
  await page.keyboard.press('Escape');
  await expect(tooltip).toBeHidden();
  await expect(target).toBeFocused();
}

/**
 * Verifies a contextual state is exposed as an atomic, polite live region in Chromium.
 * @param page - Chromium page rendering the real Angular component.
 * @param target - Current loading, typing or offline status.
 * @param name - Stable name for retained evidence.
 * @returns Resolves after checking the native accessibility tree.
 */
export async function expectAccessibleStatus(
  page: Page,
  target: Locator,
  name: string,
): Promise<void> {
  await expect(target).toBeAttached();
  const node = await captureEvidence(page, target, name);
  if (node) {
    expect(node.role?.value).toBe('status');
    expect(node.properties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'live',
          value: expect.objectContaining({ value: 'polite' }),
        }),
        expect.objectContaining({
          name: 'atomic',
          value: expect.objectContaining({ value: true }),
        }),
      ]),
    );
  }
  expect(await target.ariaSnapshot()).toContain('- status');
  expect(
    (await target.innerText()).trim() || (await target.getAttribute('aria-label')),
  ).toBeTruthy();
}

/**
 * Verifies an SVG graphic keeps its accessible name and visible geometry in the real browser.
 * @param page - Page rendering the actual feature graphic.
 * @param target - Named SVG image.
 * @param expectedName - Accessible image label.
 * @param name - Retained evidence name.
 * @returns Resolves once name, geometry and Chromium role checks pass.
 */
export async function expectAccessibleImage(
  page: Page,
  target: Locator,
  expectedName: string,
  name: string,
): Promise<void> {
  await expect(target).toBeVisible();
  await expect(target).toHaveAccessibleName(expectedName);
  const box = await target.boundingBox();
  if (!box) throw new Error('A named image must have a rendered bounding box');
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  expect(await target.evaluate((el) => el.localName)).toBe('svg');
  const node = await captureEvidence(page, target, name);
  if (node) {
    expect(node.role?.value).toBe('image');
    expect(node.name?.value).toBe(expectedName);
  }
}

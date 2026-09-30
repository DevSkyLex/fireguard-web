import { expect, test } from '@playwright/test';
import {
  criticalVisibility,
  expectCriticalActionVisible,
} from '../support/helpers/critical-visibility';

test.use({ viewport: { width: 375, height: 300 } });

test('rejects a 44px button with only 2px inside the viewport', async ({ page }) => {
  await page.setContent(
    '<button style="position:fixed;top:298px;left:20px;width:100px;height:44px">Submit</button>',
  );
  const button = page.getByRole('button', { name: 'Submit' });
  await expect(button).toBeInViewport();
  const probe = await criticalVisibility(button);
  expect(probe.visible).toBe(false);
  expect(probe.failures.join(' ')).toContain('Full action bounds');
  await expect(expectCriticalActionVisible(button)).rejects.toThrow('Critical action');
});

test('rejects a button clipped to 2px by its scroll ancestor', async ({ page }) => {
  await page.setContent(
    '<div style="position:fixed;top:20px;height:44px;overflow:hidden"><button style="margin-top:42px;width:100px;height:44px">Submit</button></div>',
  );
  expect((await criticalVisibility(page.getByRole('button'))).visible).toBe(false);
});

test('rejects an in-bounds button covered by another surface', async ({ page }) => {
  await page.setContent(
    '<button style="position:fixed;top:20px;left:20px;width:100px;height:44px">Submit</button><div style="position:fixed;inset:0;background:white"></div>',
  );
  const probe = await criticalVisibility(page.getByRole('button'));
  expect(probe.visible).toBe(false);
  expect(probe.failures.join(' ')).toContain('occluded');
});

test('accepts a fully visible action whose label receives the hit test', async ({ page }) => {
  await page.setContent('<button style="width:100px;height:44px"><span>Submit</span></button>');
  await expectCriticalActionVisible(page.getByRole('button'));
});

test('waits for a transient opening animation without scrolling the action into view', async ({
  page,
}) => {
  await page.setContent(
    '<button style="position:fixed;top:20px;left:20px;width:100px;height:44px">Submit</button>',
  );
  await page.getByRole('button').evaluate((element) => {
    element.animate([{ transform: 'translateY(400px)' }, { transform: 'translateY(0)' }], {
      duration: 350,
      fill: 'both',
    });
  });
  await expectCriticalActionVisible(page.getByRole('button'));
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('allows one pixel of rounding but rejects two pixels of clipping', async ({ page }) => {
  await page.setContent(
    '<button style="position:fixed;top:20px;left:-1px;width:100px;height:44px">Submit</button>',
  );
  await expectCriticalActionVisible(page.getByRole('button'));
  await page.getByRole('button').evaluate((element) => {
    element.style.left = '-2px';
  });
  expect((await criticalVisibility(page.getByRole('button'))).visible).toBe(false);
});

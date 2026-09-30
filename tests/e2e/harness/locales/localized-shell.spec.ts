import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, notificationOutput } from '../../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
} from '../../support/helpers/appearance';
import { expectCriticalActionVisible } from '../../support/helpers/critical-visibility';
import {
  captureInteractionMode,
  emulateMobilePlatform,
} from '../../support/helpers/interaction-mode';
import { sourceFingerprint, visualRun } from '../../support/helpers/visual-run';
import { ApiMock } from '../../support/mocks/api-mock';

// Expectations are read from the real XLF catalogs, never injected as application content.
const labels = {
  fr: {
    navigation: ['Accueil', 'Interventions', 'Actifs', 'Messages', 'Plus'],
    workspace: 'Organisation actuelle',
    open: 'Ouvrir les actions rapides',
    title: 'Actions rapides',
    description: 'Outils disponibles pour cet espace de travail.',
    notifications: 'Notifications',
    unread: /^Non lue /,
    search: 'Rechercher dans cette organisation',
    closeSearch: 'Fermer la recherche',
  },
  es: {
    navigation: ['Inicio', 'Intervenciones', 'Activos', 'Mensajes', 'Más'],
    workspace: 'Organización actual',
    open: 'Abrir acciones rápidas',
    title: 'Acciones rápidas',
    description: 'Herramientas disponibles para este espacio de trabajo.',
    notifications: 'Notificaciones',
    unread: /^Sin leer /,
    search: 'Buscar en esta organización',
    closeSearch: 'Cerrar búsqueda',
  },
};

test('renders localized navigation, More, quick actions and new accessible labels at 390px', async ({
  page,
  context,
  baseURL,
}, info) => {
  const locale: unknown = info.project.metadata['locale'];
  if (locale !== 'fr' && locale !== 'es') throw new Error('Expected an actual localized project.');
  const expected = labels[locale];
  const source = sourceFingerprint();
  const errors = collectConsoleErrors(page);
  await emulateMobilePlatform(context, 'android');
  await context.addCookies([{ name: 'theme-preference', value: 'light', url: baseURL ?? '' }]);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({
    profile: { locale },
    notifications: [notificationOutput()],
    unreadCount: 1,
  });
  await page.goto(`organizations/${E2E_ORGANIZATION_ID}/more`);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const more = page.locator('#organization-more-page');
  await expect(more.getByRole('heading', { name: expected.workspace, exact: true })).toBeVisible();
  const navigation = page.locator('#organization-mobile-navigation');
  await expect(navigation.getByRole('link')).toHaveText(expected.navigation);
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(navigation);
  await Promise.all(
    (await navigation.getByRole('link').all()).map(async (link) => {
      await expectCriticalActionVisible(link);
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }),
  );
  const html = {
    navigation: await navigation.evaluate((element) => element.outerHTML),
    more: await more.evaluate((element) => element.outerHTML),
    quickActions: '',
    notifications: '',
    search: '',
  };
  await captureInteractionMode(page, info, 'localized-more-navigation');

  const trigger = page.getByTestId('dashboard-mobile-actions-trigger');
  await expect(trigger).toHaveAccessibleName(expected.open);
  await trigger.focus();
  await trigger.press('Enter');
  const parent = page.getByTestId('dashboard-mobile-actions-drawer');
  await expect(parent.getByRole('heading', { name: expected.title, exact: true })).toBeVisible();
  await expect(parent).toContainText(expected.description);
  html.quickActions = await parent.evaluate((element) => element.outerHTML);
  await expectNoHorizontalOverflow(page);
  await captureInteractionMode(page, info, 'localized-quick-actions');
  await parent.getByTestId('notification-bell-trigger').click();
  const child = page.getByRole('dialog', { name: expected.notifications, exact: true });
  await expect(child.getByTestId('notification-bell-item')).toHaveAccessibleName(expected.unread);
  html.notifications = await child.evaluate((element) => element.outerHTML);
  await captureInteractionMode(page, info, 'localized-notification-unread');
  await page.keyboard.press('Escape');
  await expect(child).toHaveCount(0);
  await expect(parent).toBeVisible();
  await parent.getByRole('button', { name: expected.search, exact: true }).click();
  const search = page.getByTestId('global-search-palette');
  await expect(search).toBeVisible();
  await expect(parent).toHaveCount(0);
  const searchDialog = page.getByRole('dialog', { name: expected.search, exact: true });
  const close = searchDialog.getByRole('button', { name: expected.closeSearch, exact: true });
  await expectCriticalActionVisible(close);
  html.search = await searchDialog.evaluate((element) => element.outerHTML);
  await captureInteractionMode(page, info, 'localized-search-close');
  await close.click();
  await expect(search).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);

  const directory = resolve(visualRun().directory, 'locales', locale);
  await mkdir(directory, { recursive: true });
  const htmlPath = resolve(directory, 'rendered-surfaces.html');
  await writeFile(
    htmlPath,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><body>${Object.values(html).join('\n')}</body></html>`,
  );
  await info.attach('actual-localized-dom', { path: htmlPath, contentType: 'text/html' });
  const sourceEnd = sourceFingerprint();
  await writeFile(
    resolve(directory, 'evidence.json'),
    JSON.stringify(
      {
        locale,
        source,
        sourceEnd,
        sourceChanged: source.fingerprint !== sourceEnd.fingerprint,
        scenarios: [
          'Compiled locale HTML language and catalog text',
          'Five full visible 44px minimum mobile navigation targets',
          'More organization heading',
          'Localized Quick actions heading, description and opener',
          'Localized unread accessible prefix',
          'Localized Search close label and opener focus restoration',
        ],
        scope:
          'Chromium mobile 390x844 light; More and nested quick actions only; fixture business data remains English; not all routes, catalogs or physical devices.',
      },
      null,
      2,
    ),
  );
  expect(sourceEnd.fingerprint, 'Source must remain stable during the locale check.').toBe(
    source.fingerprint,
  );
});

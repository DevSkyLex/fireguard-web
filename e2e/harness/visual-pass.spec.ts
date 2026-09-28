import { expect, test } from '@playwright/test';
import {
  isConfirmationRoute,
  MOBILE_VISUAL_MODES,
  MOBILE_VISUAL_ROUTES,
  REPRESENTATIVE_VISUAL_ROUTES,
  selectVisualRoutes,
} from '../support/helpers/mobile-visual-matrix';
import { sourceFingerprint, visualRun } from '../support/helpers/visual-run';

/**
 * The independently-derived expected inspection-pass count: every route for each `full` mode,
 * plus the representative subset for each non-`full` one — computed straight from the matrix's
 * own source arrays, not by calling `selectVisualRoutes` itself, so this spec still catches a
 * regression in that function.
 */
const EXPECTED_INSPECTION_COUNT = MOBILE_VISUAL_MODES.reduce(
  (total, mode) =>
    total +
    (mode.full
      ? MOBILE_VISUAL_ROUTES.length
      : MOBILE_VISUAL_ROUTES.filter((route) => REPRESENTATIVE_VISUAL_ROUTES.has(route.id)).length),
  0,
);

/** The representative-subset count shared by every non-`full` mode, including `phone-458-dark`. */
const EXPECTED_REPRESENTATIVE_COUNT = MOBILE_VISUAL_ROUTES.filter((route) =>
  REPRESENTATIVE_VISUAL_ROUTES.has(route.id),
).length;

/**
 * The independently-derived expected confirmation-pass count: `isConfirmationRoute` applied
 * directly to the matrix's own arrays, never through `selectVisualRoutes` itself, so this spec
 * still catches a regression in that function's `confirmation`-branch composition.
 */
const EXPECTED_CONFIRMATION_COUNT = MOBILE_VISUAL_MODES.reduce(
  (total, mode) =>
    total + MOBILE_VISUAL_ROUTES.filter((route) => isConfirmationRoute(mode.name, route.id)).length,
  0,
);

test('selects every inspection case independently from a run named confirmation', () => {
  const run = visualRun({ FG_VISUAL_RUN: 'confirmation' });
  expect(run.pass).toBe('inspection');
  expect(MOBILE_VISUAL_MODES.flatMap((mode) => selectVisualRoutes(mode, run.pass))).toHaveLength(
    EXPECTED_INSPECTION_COUNT,
  );
  const phone458 = MOBILE_VISUAL_MODES.find((mode) => mode.name === 'phone-458-dark');
  if (!phone458) throw new Error('Missing the required 458px mobile complement.');
  expect(phone458).toMatchObject({ width: 458, mobile: true, full: false, theme: 'dark' });
  expect(selectVisualRoutes(phone458, run.pass)).toHaveLength(EXPECTED_REPRESENTATIVE_COUNT);
});

test('selects every confirmation risk with a custom evidence directory name', () => {
  const run = visualRun({ FG_VISUAL_RUN: 'revision-123', FG_VISUAL_PASS: 'confirmation' });
  expect(run.name).toBe('revision-123');
  const routes = MOBILE_VISUAL_MODES.flatMap((mode) =>
    selectVisualRoutes(mode, run.pass).map((route) => `${mode.name}/${route.id}`),
  );
  expect(routes).toHaveLength(EXPECTED_CONFIRMATION_COUNT);
  expect(routes).toContain('phone-458-dark/home');
  expect(routes).toContain('desktop-375-light/intervention-form');
  expect(routes).toContain('phone-390-dark/saved-messages');
  expect(routes).not.toContain('phone-390-light/security');
});

test('rejects an invalid pass and an unsafe artifact directory', () => {
  expect(() => visualRun({ FG_VISUAL_PASS: 'confirm' })).toThrow('FG_VISUAL_PASS');
  expect(() => visualRun({ FG_VISUAL_RUN: '../inspection' })).toThrow('FG_VISUAL_RUN');
});

test('records a revision and authored working-tree fingerprint without environment files', () => {
  const source = sourceFingerprint();
  expect(source.revision).toMatch(/^[a-f0-9]{40}$/);
  expect(source.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(typeof source.dirty).toBe('boolean');
  expect(source.files).toBeGreaterThan(10);
  expect(source.scope).not.toContain('src/environments');
});

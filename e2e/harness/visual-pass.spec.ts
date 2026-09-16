import { expect, test } from '@playwright/test';
import { MOBILE_VISUAL_MODES, selectVisualRoutes } from '../support/helpers/mobile-visual-matrix';
import { sourceFingerprint, visualRun } from '../support/helpers/visual-run';

test('selects 100 inspection cases independently from a run named confirmation', () => {
  const run = visualRun({ FG_VISUAL_RUN: 'confirmation' });
  expect(run.pass).toBe('inspection');
  expect(MOBILE_VISUAL_MODES.flatMap((mode) => selectVisualRoutes(mode, run.pass))).toHaveLength(
    100,
  );
  const phone458 = MOBILE_VISUAL_MODES.find((mode) => mode.name === 'phone-458-dark');
  if (!phone458) throw new Error('Missing the required 458px mobile complement.');
  expect(phone458).toMatchObject({ width: 458, mobile: true, full: false, theme: 'dark' });
  expect(selectVisualRoutes(phone458, run.pass)).toHaveLength(8);
});

test('selects the 28 confirmation risks with a custom evidence directory name', () => {
  const run = visualRun({ FG_VISUAL_RUN: 'revision-123', FG_VISUAL_PASS: 'confirmation' });
  expect(run.name).toBe('revision-123');
  const routes = MOBILE_VISUAL_MODES.flatMap((mode) =>
    selectVisualRoutes(mode, run.pass).map((route) => `${mode.name}/${route.id}`),
  );
  expect(routes).toHaveLength(28);
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

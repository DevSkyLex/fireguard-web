import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import {
  recordConfirmedReplacementResult,
  recordOfflineMaintenanceResult,
} from '../support/helpers/intervention-execution';

test('records an unsuccessful maintenance attempt with touch controls and preserves offline facts', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  await recordOfflineMaintenanceResult(page);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('keeps a replacement draft while confirming its successor and replays it offline with touch controls', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  await recordConfirmedReplacementResult(page);
  expect(errors).toEqual([]);
});

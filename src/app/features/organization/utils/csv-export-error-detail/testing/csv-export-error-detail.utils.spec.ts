import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  buildCsvExportFilename,
  resolveCsvExportErrorDetail,
} from '../csv-export-error-detail.utils';

describe('resolveCsvExportErrorDetail', () => {
  it('resolves the RFC 7807 detail out of a JSON blob body', async () => {
    const body = new Blob(
      [
        JSON.stringify({
          '@id': '/errors/422',
          '@type': 'hydra:Error',
          title: 'Unprocessable entity',
          detail: 'The export exceeds 50,000 rows.',
          status: 422,
        }),
      ],
      { type: 'application/problem+json' },
    );

    await expect(
      resolveCsvExportErrorDetail(new HttpErrorResponse({ status: 422, error: body })),
    ).resolves.toBe('The export exceeds 50,000 rows.');
  });

  it('answers null when the body is not a blob', async () => {
    await expect(
      resolveCsvExportErrorDetail(new HttpErrorResponse({ status: 0, error: 'offline' })),
    ).resolves.toBeNull();
  });

  it('answers null when the blob does not hold JSON', async () => {
    const body = new Blob(['<html>bad gateway</html>'], { type: 'text/html' });

    await expect(
      resolveCsvExportErrorDetail(new HttpErrorResponse({ status: 502, error: body })),
    ).resolves.toBeNull();
  });

  it('answers null when the JSON is not an RFC 7807 problem document', async () => {
    const body = new Blob([JSON.stringify({ message: 'nope' })], { type: 'application/json' });

    await expect(
      resolveCsvExportErrorDetail(new HttpErrorResponse({ status: 422, error: body })),
    ).resolves.toBeNull();
  });
});

describe('buildCsvExportFilename', () => {
  it('stamps the prefix and organization with the zero-padded date', () => {
    expect(buildCsvExportFilename('equipments', 'org-1', new Date(2026, 0, 5))).toBe(
      'equipments-org-1-20260105.csv',
    );
  });
});

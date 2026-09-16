import type { InteractionModeRequestHeaders } from '../../../models/interaction-mode-request-headers.interface';
import { classifyServerInteractionMode } from '../classify-server-interaction-mode.utils';

function headers(values: Readonly<Record<string, string>>): InteractionModeRequestHeaders {
  return {
    get: (name: string): string | null => values[name.toLowerCase()] ?? null,
  };
}

describe('classifyServerInteractionMode', () => {
  it.each([
    ['an iPhone', { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }],
    ['an Android phone', { 'user-agent': 'Mozilla/5.0 (Linux; Android 16; Mobile)' }],
    ['an Android tablet', { 'user-agent': 'Mozilla/5.0 (Linux; Android 16; Tablet)' }],
    ['an Android client hint', { 'sec-ch-ua-platform': '"Android"', 'sec-ch-ua-mobile': '?0' }],
  ])('classifies %s as mobile', (_label, values) => {
    expect(classifyServerInteractionMode(headers(values))).toBe('mobile');
  });

  it.each([
    ['missing headers', null],
    ['unknown evidence', headers({ 'user-agent': 'Privacy Browser' })],
    [
      'a narrow Windows browser',
      headers({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Mobile)', 'sec-ch-ua-mobile': '?1' }),
    ],
    [
      'a desktop-style iPad user agent',
      headers({ 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)' }),
    ],
    [
      'contradictory platform evidence',
      headers({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Android 16)' }),
    ],
  ])('defaults %s to desktop', (_label, requestHeaders) => {
    expect(classifyServerInteractionMode(requestHeaders)).toBe('desktop');
  });
});

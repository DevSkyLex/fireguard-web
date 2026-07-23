import type { ActivatedRoute } from '@angular/router';
import { readChannelRoute } from '../utils';

/** Minimal stand-in: the util only walks `firstChild` and reads the snapshot. */
function route(params: Record<string, string>, firstChild: unknown = null): ActivatedRoute {
  return {
    firstChild,
    snapshot: { paramMap: { get: (key: string): string | null => params[key] ?? null } },
  } as unknown as ActivatedRoute;
}

describe('readChannelRoute', () => {
  it('should read both ids off the deepest route', () => {
    const deepest = route({ organizationId: 'org-1', channelId: 'chan-1' });
    const root = route({}, route({ organizationId: 'org-1' }, deepest));

    expect(readChannelRoute(root)).toEqual({ organizationId: 'org-1', channelId: 'chan-1' });
  });

  it('should ignore a parent that carries the ids when the leaf does not', () => {
    // Inheritance is the router's job — the util must not paper over a leaf
    // that is genuinely not a conversation.
    const root = route({ organizationId: 'org-1', channelId: 'chan-1' }, route({}));

    expect(readChannelRoute(root)).toBeNull();
  });

  it('should return null on a route without a channel', () => {
    const root = route({}, route({ organizationId: 'org-1' }));

    expect(readChannelRoute(root)).toBeNull();
  });

  it('should return null when the organization is missing', () => {
    const root = route({}, route({ channelId: 'chan-1' }));

    expect(readChannelRoute(root)).toBeNull();
  });

  it('should handle a root that is itself the leaf', () => {
    expect(readChannelRoute(route({ organizationId: 'org-1', channelId: 'chan-1' }))).toEqual({
      organizationId: 'org-1',
      channelId: 'chan-1',
    });
  });
});

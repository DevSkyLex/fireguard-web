import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { ChannelService } from '@features/collaboration/data-access';
import type { ChannelOutput } from '@features/collaboration/models';
import { channelTitleResolver } from '../channel-title.resolver';

describe('channelTitleResolver', () => {
  const channel: ChannelOutput = {
    '@id': '/api/channels/genid-1',
    '@type': 'ChannelResource',
    id: 'chan-1',
    organization: '/api/organizations/org-1',
    name: 'general',
    participantCount: 3,
    isArchived: false,
    messagesCount: 12,
    unreadCount: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    isFavorite: false,
  };

  const get = vi.fn<(channelId: string) => Observable<ChannelOutput>>();

  const routeWith = (channelId: string | null): ActivatedRouteSnapshot =>
    ({ paramMap: { get: (): string | null => channelId } }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    get.mockReset();
    get.mockReturnValue(of(channel));

    TestBed.configureTestingModule({
      providers: [{ provide: ChannelService, useValue: { get } }],
    });
  });

  it('should resolve the channel name prefixed with a hash', async () => {
    const result = TestBed.runInInjectionContext(() =>
      channelTitleResolver(routeWith('chan-1'), {} as never),
    );

    await expect(firstValueFrom(result as Observable<string>)).resolves.toBe('#general');
    expect(get).toHaveBeenCalledWith('chan-1');
  });

  it('should fall back to a neutral label when the id is missing', () => {
    const result = TestBed.runInInjectionContext(() =>
      channelTitleResolver(routeWith(null), {} as never),
    );

    expect(result).toBe('Channel');
    expect(get).not.toHaveBeenCalled();
  });

  it('should fall back to a neutral label when the read fails', async () => {
    get.mockReturnValue(throwError(() => new Error('boom')));

    const result = TestBed.runInInjectionContext(() =>
      channelTitleResolver(routeWith('chan-1'), {} as never),
    );

    await expect(firstValueFrom(result as Observable<string>)).resolves.toBe('Channel');
  });
});

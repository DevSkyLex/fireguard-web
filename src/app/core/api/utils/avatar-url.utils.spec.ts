import type { AvatarUrls } from '../models';
import { pickAvatarUrl } from './avatar-url.utils';

describe('pickAvatarUrl', () => {
  it('returns the exact size variant when available', () => {
    const avatarUrls: AvatarUrls = { '256': 'a.png', '128': 'b.png', '64': 'c.png', '32': 'd.png' };
    expect(pickAvatarUrl(avatarUrls, '128')).toBe('b.png');
  });

  it('falls back to a larger variant when the exact size is missing', () => {
    const avatarUrls: AvatarUrls = { '256': 'a.png' };
    expect(pickAvatarUrl(avatarUrls, '64')).toBe('a.png');
  });

  it('falls back to a smaller variant when no larger variant exists', () => {
    const avatarUrls: AvatarUrls = { '32': 'd.png' };
    expect(pickAvatarUrl(avatarUrls, '256')).toBe('d.png');
  });

  it('returns the legacy fallback when no variant map is provided', () => {
    expect(pickAvatarUrl(null, '128', 'legacy.png')).toBe('legacy.png');
    expect(pickAvatarUrl(undefined, '128', 'legacy.png')).toBe('legacy.png');
  });

  it('returns the legacy fallback when the variant map has no usable url', () => {
    expect(pickAvatarUrl({}, '128', 'legacy.png')).toBe('legacy.png');
  });

  it('returns null when nothing is available', () => {
    expect(pickAvatarUrl(null, '128')).toBeNull();
    expect(pickAvatarUrl({}, '128')).toBeNull();
  });
});

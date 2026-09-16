import type { InteractionModeEvidence } from '../../../models/interaction-mode-evidence.interface';
import { classifyInteractionMode } from '../classify-interaction-mode.utils';

describe('classifyInteractionMode', () => {
  it.each<InteractionModeEvidence>([
    { platform: 'iPhone', userAgent: 'iPhone OS 18 like Mac OS X', maxTouchPoints: 5 },
    { platform: 'iPad', userAgent: 'iPad; CPU OS 18 like Mac OS X', maxTouchPoints: 5 },
    { platform: 'iPod', maxTouchPoints: 1 },
    { platform: 'MacIntel', userAgent: 'Macintosh; Intel Mac OS X 10_15', maxTouchPoints: 5 },
    { platform: 'Linux armv8l', userAgent: 'Linux; Android 16; Pixel Mobile', maxTouchPoints: 5 },
    { platform: 'Linux aarch64', userAgent: 'Linux; Android 16; SM-X920', maxTouchPoints: 10 },
    { userAgentData: { platform: 'Android', mobile: false }, anyPointerCoarse: true },
    {
      platform: 'Linux armv8l',
      userAgentData: { platform: 'Android', mobile: false },
      maxTouchPoints: 5,
    },
    { userAgentData: { platform: 'iOS', mobile: false }, maxTouchPoints: 5 },
    { userAgentData: { mobile: true }, maxTouchPoints: 1 },
    { userAgentData: { mobile: true }, anyPointerCoarse: true },
    { userAgent: 'Android', maxTouchPoints: 0, anyPointerCoarse: true },
    { platform: 'iPhone', maxTouchPoints: 0, anyPointerCoarse: true },
    { platform: 'MacIntel', maxTouchPoints: 2, anyPointerCoarse: false },
  ])('recognizes a phone or tablet with touch evidence: %j', (device) => {
    expect(classifyInteractionMode(device)).toBe('mobile');
  });

  it.each<InteractionModeEvidence>([
    {},
    { anyPointerCoarse: true, maxTouchPoints: 10 },
    { platform: 'Unknown', userAgent: 'Mobile', anyPointerCoarse: true },
    { platform: 'Win32', maxTouchPoints: 10, anyPointerCoarse: true },
    { platform: 'Win64', userAgentData: { mobile: true }, maxTouchPoints: 10 },
    { userAgent: 'Windows NT 10.0; Android', maxTouchPoints: 10 },
    { userAgentData: { platform: 'Windows', mobile: true }, anyPointerCoarse: true },
    { userAgent: 'CrOS x86_64', maxTouchPoints: 10 },
    { userAgentData: { platform: 'Chrome OS', mobile: true }, maxTouchPoints: 10 },
    { platform: 'Linux x86_64', maxTouchPoints: 10, anyPointerCoarse: true },
    { userAgentData: { platform: 'Linux', mobile: true }, maxTouchPoints: 10 },
    { platform: 'MacIntel', maxTouchPoints: 0, anyPointerCoarse: true },
    { platform: 'MacIntel', maxTouchPoints: 1, anyPointerCoarse: true },
    { platform: 'MacPPC', maxTouchPoints: 5, userAgentData: { mobile: true } },
    { userAgentData: { platform: 'macOS', mobile: true }, maxTouchPoints: 5 },
    { userAgent: 'Macintosh; Intel Mac OS X', maxTouchPoints: 5 },
    { platform: 'iPhone', maxTouchPoints: 0 },
    { userAgent: 'Android', maxTouchPoints: 0 },
    { userAgentData: { mobile: true } },
    { userAgentData: { platform: 'Android', mobile: false } },
    { platform: 'iPhone', userAgentData: { platform: 'Windows' }, maxTouchPoints: 5 },
    { platform: 'MacIntel', userAgentData: { platform: 'Windows' }, maxTouchPoints: 5 },
    { platform: 'iPhone', userAgent: 'Android', maxTouchPoints: 5 },
    { platform: 'MacIntel', userAgent: 'Android', maxTouchPoints: 5 },
    { platform: 'Win32', userAgentData: { platform: 'Android', mobile: true }, maxTouchPoints: 5 },
    { platform: 'Android', maxTouchPoints: -1 },
    { platform: 'Android', maxTouchPoints: Number.NaN },
  ])('defaults unknown or conflicting devices and desktop platforms to desktop: %j', (device) => {
    expect(classifyInteractionMode(device)).toBe('desktop');
  });

  it('does not mutate the input snapshot', () => {
    const device = Object.freeze({ platform: 'iPad', maxTouchPoints: 5 });
    expect(classifyInteractionMode(device)).toBe('mobile');
    expect(device).toEqual({ platform: 'iPad', maxTouchPoints: 5 });
  });
});

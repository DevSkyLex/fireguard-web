import type { InteractionModeRequestHeaders } from '../../models/interaction-mode-request-headers.interface';
import type { InteractionMode } from '../../models/interaction-mode.type';

/**
 * Function classifyServerInteractionMode
 * @description Uses stable mobile platform evidence from request headers and defaults conflicts to desktop.
 * Viewport dimensions are intentionally absent. Desktop-style iPad user agents remain desktop until
 * browser capabilities can reconcile them after hydration.
 * @access public
 * @since 1.0.0
 * @param {InteractionModeRequestHeaders | null} headers - Request headers available during SSR.
 * @returns {InteractionMode} Conservative server-side interaction mode.
 */
export function classifyServerInteractionMode(
  headers: InteractionModeRequestHeaders | null,
): InteractionMode {
  if (!headers) return 'desktop';

  const userAgent = headers.get('user-agent') ?? '';
  const platformHint = headers.get('sec-ch-ua-platform') ?? '';
  const mobileHint = headers.get('sec-ch-ua-mobile') ?? '';
  const evidence = `${platformHint} ${userAgent}`;
  const android = /android/iu.test(evidence);
  const ios = /iPhone|iPad|iPod|\biOS\b/iu.test(evidence);
  const windowsOrChromeOs = /Windows|Win32|Win64|CrOS|Chrome OS|Chromium OS/iu.test(evidence);
  const linuxDesktop = /linux/iu.test(evidence) && !android;
  const macDesktop = /Macintosh|Mac OS X|macOS/iu.test(evidence) && !ios;

  if (windowsOrChromeOs || linuxDesktop || macDesktop || (android && ios)) return 'desktop';
  if (android || ios) return 'mobile';

  return mobileHint.trim() === '?1' && /\bMobile\b/iu.test(userAgent) ? 'mobile' : 'desktop';
}

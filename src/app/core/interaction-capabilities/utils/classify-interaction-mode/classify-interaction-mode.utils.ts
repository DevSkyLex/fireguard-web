import type { InteractionModeEvidence } from '../../models/interaction-mode-evidence.interface';
import type { InteractionMode } from '../../models/interaction-mode.type';

/**
 * Function classifyInteractionMode
 * @description Excludes desktop platforms, then requires mobile evidence and touch capability.
 * Conflicting or unknown evidence defaults to desktop.
 * MacIntel with multiple touch points is the iPad exception; Android tablets need no Mobile UA token.
 * @access public
 * @since 1.0.0
 * @param {InteractionModeEvidence} device - A single browser capability snapshot.
 * @returns {InteractionMode} Stable interaction mode for this snapshot.
 */
export function classifyInteractionMode(device: InteractionModeEvidence): InteractionMode {
  const platform = device.platform ?? '';
  const hintPlatform = device.userAgentData?.platform ?? '';
  const userAgent = device.userAgent ?? '';
  const evidence = `${platform} ${hintPlatform} ${userAgent}`;
  const android = /android/i.test(evidence);
  const ios = /iPhone|iPad|iPod|\biOS\b/i.test(evidence);
  const ipad = /^MacIntel$/i.test(platform) && (device.maxTouchPoints ?? 0) > 1;
  const windowsOrChromeOs = /Win32|Win64|Windows|CrOS|Chrome OS|Chromium OS/i.test(evidence);
  const linuxDesktop = /linux/i.test(evidence) && !android;
  const macPlatform = /mac/i.test(`${platform} ${hintPlatform}`);
  const macUserAgent = /Macintosh|Mac OS X/i.test(userAgent) && !ios;
  const conflictingMobile = android && (ios || ipad);

  if (
    windowsOrChromeOs ||
    linuxDesktop ||
    ((macPlatform || macUserAgent) && !ipad) ||
    conflictingMobile
  ) {
    return 'desktop';
  }

  const touch = (device.maxTouchPoints ?? 0) > 0 || device.anyPointerCoarse === true;
  const mobile = android || ios || ipad || device.userAgentData?.mobile === true;
  return touch && mobile ? 'mobile' : 'desktop';
}

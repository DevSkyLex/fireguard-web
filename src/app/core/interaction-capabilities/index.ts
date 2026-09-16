export { provideInteractionCapabilities } from './interaction-capabilities.provider';
export { INTERACTION_CAPABILITIES_PORT, type InteractionCapabilitiesPort } from './ports';
export type { InteractionMode } from './models/interaction-mode.type';
export type { ShortcutModifier } from './models/shortcut-modifier.type';
export type { ShortcutPlatformEvidence } from './models/shortcut-platform-evidence.interface';
export { formatShortcut, resolveShortcutModifier } from './utils';

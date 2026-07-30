import type { TagDescriptor } from '@shared/tag';

/**
 * Presentation descriptor for a single equipment-owned enum value (equipment
 * lifecycle status).
 *
 * Aliases the app-wide {@link TagDescriptor} (label + severity + icon) so the
 * registry keeps a domain-named type while the shared {@link Tag} component owns
 * the rendering and the severity → colour mapping. Lives in `equipment-status-tag/`
 * because the sibling `equipment-tag/` folder already owns the equipment-labelling
 * domain contract (`EquipmentTagOutput`).
 */
export type EquipmentTagDescriptor = TagDescriptor;

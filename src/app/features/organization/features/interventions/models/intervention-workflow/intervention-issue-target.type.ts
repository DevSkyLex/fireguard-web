import type { InterventionEditTarget } from '../intervention-edit/intervention-edit-target.type';
import type { InterventionLinkedResourceTabId } from './intervention-linked-resource-tab-id.type';

/**
 * Where activating a publication issue sends the operator, resolved by
 * `resolveInterventionIssueTarget` from the issue's `resource` IRI and
 * `field`. `railTab` switches the left-hand rail to the sibling-resource
 * lookup the issue concerns; `edit` opens the in-place editor for the
 * intervention-level field at fault; `workItems` is the safe fallback — the
 * field-work section — for every issue the mapper cannot address more
 * precisely.
 */
export type InterventionIssueTarget =
  | { readonly kind: 'railTab'; readonly tab: InterventionLinkedResourceTabId }
  | { readonly kind: 'edit'; readonly target: InterventionEditTarget }
  | { readonly kind: 'workItems' };

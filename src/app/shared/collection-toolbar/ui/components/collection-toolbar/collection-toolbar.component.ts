import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component CollectionToolbar
 * @class CollectionToolbar
 *
 * @description
 * The two-slot toolbar shell shared by every collection surface's list
 * page (roster, facilities, equipments, inspections, interventions):
 * `toolbarStart` for search/segmented controls, `toolbarEnd` for action
 * buttons. Purely presentational (`ARCHITECTURE.md` §10.3) — no inputs, no
 * outputs, no injected store. Its only job is the wrap behaviour: `hlmBtn`
 * forces every button `shrink-0 whitespace-nowrap` by design, so a button
 * can never absorb the toolbar's width itself — only the slot's own
 * `flex-wrap` can move a whole button to the next line, which is why
 * callers must never add `min-w-0 flex-1` to a button or a popover wrapper
 * inside either slot. Moved from `features/organization` to `shared` as a
 * deliberate uniformity bet, recorded in `organization/FEATURE.md` § UI
 * Conventions — the folder held only organization consumers at the time of
 * the move.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-toolbar',
  imports: [],
  templateUrl: './collection-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionToolbar {}

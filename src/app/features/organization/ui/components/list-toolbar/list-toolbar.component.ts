import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component ListToolbar
 * @class ListToolbar
 *
 * @description
 * The two-slot toolbar shell shared by the organization feature's list
 * pages: `toolbarStart` for search/segmented controls, `toolbarEnd` for
 * action buttons. Purely presentational (`ARCHITECTURE.md` §10.3) — no
 * inputs, no outputs, no injected store. Its only job is the wrap
 * behaviour: `hlmBtn` forces every button `shrink-0 whitespace-nowrap` by
 * design, so a button can never absorb the toolbar's width itself — only
 * the slot's own `flex-wrap` can move a whole button to the next line, which
 * is why callers must never add `min-w-0 flex-1` to a button or a popover
 * wrapper inside either slot.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-list-toolbar',
  imports: [],
  templateUrl: './list-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListToolbar {}

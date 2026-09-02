import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component RequiredMarker
 * @class RequiredMarker
 * @description
 * The asterisk a required field's label carries, plus its screen-reader
 * name: `&nbsp;*` in the destructive tint for sighted readers, " required"
 * as `sr-only` text for everyone else. One component so the 33 labels that
 * used to hand-copy both spans render, and announce, exactly the same
 * (`ARCHITECTURE.md` §2.9 — the third copy was reached long ago). Generic
 * by design: it names no field and takes no input.
 * @version 1.0.0
 * @example
 * ```html
 * <label hlmFieldLabel for="facility-create-name"
 *   ><span i18n="@@facility.form.name">Name</span><app-required-marker
 * /></label>
 * ```
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-required-marker',
  templateUrl: './required-marker.component.html',
  host: { class: 'inline' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequiredMarker {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideClipboardCheck,
  lucideFlame,
  lucideWifiOff,
} from '@ng-icons/lucide';

/**
 * Interface ShowcaseProofPoint
 *
 * @description
 * One capability named in the branded panel: a registered icon name, a short
 * label, and the sentence that makes it concrete.
 *
 * @since 1.0.0
 */
interface ShowcaseProofPoint {
  readonly icon: string;
  readonly label: string;
  readonly detail: string;
}

/**
 * Component SplitLayoutShowcase
 * @class SplitLayoutShowcase
 *
 * @description
 * The branded half of the public shell: what FireGuard is, in the few seconds
 * someone spends signing in.
 *
 * It is layout-local shell chrome rather than a feature widget — it knows no
 * business state and no route (`ARCHITECTURE.md` §8.2). It reaches the shell
 * through the showcase slot, so a route that wants a different panel can claim
 * the slot instead of editing this one.
 *
 * The panel deliberately inverts the surface (`bg-primary`): the theme is
 * neutral by design, so contrast — not an invented brand colour — is what sets
 * it apart from the form column, and the inversion holds in both themes.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout-showcase />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * The decorative layer is `aria-hidden`: two soft pools of light that keep the
 * slab from reading as a flat rectangle, built from `currentColor` so they
 * follow the inverted foreground in either theme instead of hard-coding a hue.
 * `overflow-hidden` clips them and `isolate` gives them a stacking context, so
 * they cannot escape over the form column.
 */
@Component({
  selector: 'app-split-layout-showcase',
  imports: [NgIcon],
  providers: [provideIcons({ lucideBuilding2, lucideClipboardCheck, lucideFlame, lucideWifiOff })],
  templateUrl: './split-layout-showcase.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutShowcase {
  //#region Properties
  /**
   * Property proofPoints
   * @readonly
   *
   * @description
   * The three capabilities worth naming here. Each is something the product
   * actually does, so the panel stays a description rather than a slogan.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly ShowcaseProofPoint[]}
   */
  protected readonly proofPoints: readonly ShowcaseProofPoint[] = [
    {
      icon: 'lucideClipboardCheck',
      label: $localize`:@@auth.showcase.lifecycle.label:One thread per intervention`,
      detail: $localize`:@@auth.showcase.lifecycle.detail:Plan it, run it in the field, publish the report — without re-entering anything.`,
    },
    {
      icon: 'lucideWifiOff',
      label: $localize`:@@auth.showcase.offline.label:Works with no signal`,
      detail: $localize`:@@auth.showcase.offline.detail:Boiler rooms and basements included. Work saves on the device and syncs when the network returns.`,
    },
    {
      icon: 'lucideBuilding2',
      label: $localize`:@@auth.showcase.estate.label:Your whole estate, one place`,
      detail: $localize`:@@auth.showcase.estate.detail:Sites, equipment and inspections stay linked, so a serial number is enough to find the history.`,
    },
  ];
  //#endregion
}

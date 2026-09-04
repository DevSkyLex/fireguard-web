import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideClipboardCheck, lucideWifiOff } from '@ng-icons/lucide';

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
 * Spacious neutral presentation for the entry shell. It names existing capabilities
 * through the showcase slot without owning business state or navigation.
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
 */
@Component({
  selector: 'app-split-layout-showcase',
  imports: [NgIcon],
  providers: [provideIcons({ lucideBuilding2, lucideClipboardCheck, lucideWifiOff })],
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

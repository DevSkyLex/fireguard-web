import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { InventoryRow, InventoryRowAction } from './inventory-row.interface';

/**
 * Class InventoryDataview
 *
 * @description
 * Responsive stock facts and paginated history emit intent without feature-store access.
 */
@Component({
  selector: 'app-inventory-dataview',
  templateUrl: './inventory-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OrgDatePipe,
    RouterLink,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmItemImports,
    ...HlmEmptyImports,
  ],
})
export class InventoryDataview {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Scope of linked work dossiers.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * Organization date pattern and timezone.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting = input<RegionalFormatSettings>(
    DEFAULT_REGIONAL_FORMAT_SETTINGS,
  );
  /**
   * Property rows
   * @readonly
   *
   * @description
   * Prepared quantity-only records.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<readonly InventoryRow[]>}
   */
  public readonly rows = input<readonly InventoryRow[]>([]);
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Initial or refreshed query progress.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly loading = input(false);
  /**
   * Property loaded
   * @readonly
   *
   * @description
   * Empty state requires a successful server read.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly loaded = input(false);
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Offline state or accepted command blocks new row actions.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<boolean>}
   */
  public readonly disabled = input(false);
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<number>}
   */
  public readonly page = input(1);
  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Exact server page count.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').InputSignal<number>}
   */
  public readonly pageCount = input(1);
  /**
   * Property action
   * @readonly
   *
   * @description
   * Explicit host-owned row command.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<InventoryRowAction>}
   */
  public readonly action = output<InventoryRowAction>();
  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Requested next server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {import('@angular/core').OutputEmitterRef<number>}
   */
  public readonly pageChanged = output<number>();
}

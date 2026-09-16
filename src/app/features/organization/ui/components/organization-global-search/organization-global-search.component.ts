import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
  type ElementRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { OrganizationGlobalSearchService } from '@features/organization/services/organization-global-search';
import {
  ActiveOrganizationStore,
  type ActiveOrganizationStoreType,
} from '@features/organization/state';
import { SLOT_PRESENTATION, type SlotPresentation } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';
import { HlmItem, HlmItemContent, HlmItemMedia, HlmItemTitle } from '@shared/ui/item';
import { HlmKbdImports } from '@shared/ui/kbd';

/**
 * Component OrganizationGlobalSearch
 * @class OrganizationGlobalSearch
 *
 * @description
 * Organization-owned search trigger contributed to the header or mobile actions.
 * Its render lifetime supplies native focus context, never the keyboard listener
 * or query store: the feature service can open search while this view is absent.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-global-search',
  imports: [NgIcon, HlmButton, HlmItem, HlmItemContent, HlmItemMedia, HlmItemTitle, HlmKbdImports],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './organization-global-search.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationGlobalSearch {
  //#region Properties
  /**
   * Property slotPresentation
   * @readonly
   * @description Native item row in mobile actions, compact header button elsewhere.
   * @access protected
   * @since 1.1.0
   * @type {SlotPresentation}
   */
  protected readonly slotPresentation: SlotPresentation = inject(SLOT_PRESENTATION);

  /**
   * Property organizationContext
   * @readonly
   * @description Hides the trigger when there is no organization to search.
   * @access protected
   * @since 1.0.0
   * @type {ActiveOrganizationStoreType}
   */
  protected readonly organizationContext: ActiveOrganizationStoreType =
    inject(ActiveOrganizationStore);

  /**
   * Property search
   * @readonly
   * @description Single feature-owned palette and shortcut, shared across trigger remounts.
   * @access protected
   * @since 1.0.0
   * @type {OrganizationGlobalSearchService}
   */
  protected readonly search: OrganizationGlobalSearchService = inject(
    OrganizationGlobalSearchService,
  );

  /**
   * Property trigger
   * @readonly
   * @description Live native opener used only for focus restoration.
   * @access private
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly trigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild('trigger');

  /**
   * Property parentDialog
   * @readonly
   * @description Optional native parent to dismiss before opening a separate search palette.
   * @access private
   * @since 1.0.0
   * @type {BrnDialogRef<unknown> | null}
   */
  private readonly parentDialog: BrnDialogRef<unknown> | null = inject(BrnDialogRef, {
    optional: true,
  });
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   * @description Registers live focus context after rendering and releases it on view destruction.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterRenderEffect((onCleanup) => {
      const trigger = this.trigger();
      if (trigger) onCleanup(this.search.registerTrigger(trigger.nativeElement, this.parentDialog));
    });
  }
  //#endregion
}

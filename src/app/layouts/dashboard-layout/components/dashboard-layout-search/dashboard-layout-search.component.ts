import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardSidebarNavigationService } from '@layouts/dashboard-layout/services';

/**
 * Interface DashboardSearchEntry
 *
 * @description
 * Flattened, navigable view of one sidebar navigation item, grouped under
 * its section label inside the search palette.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
interface DashboardSearchEntry {
  readonly id: string;
  readonly label: string;
  readonly icon: string | null;
  readonly section: string;
  readonly routerLink: string;
}

/**
 * Whether a keydown originated inside a field where the user is typing.
 *
 * Cmd/Ctrl+K is claimed by other surfaces: Quill (the comment composer) binds
 * it to "insert link", and any future message composer will want it too. The
 * palette must not steal it mid-sentence — but it must still close itself when
 * already open, which is why the caller only consults this while closed.
 *
 * The `contenteditable` branch covers Quill, whose editor is a `div`. It uses
 * `closest()` rather than the `isContentEditable` property for two reasons: it
 * catches events raised by nodes *inside* the editable region, and jsdom does
 * not implement `isContentEditable` — a property-based check would be silently
 * untestable.
 *
 * @param {EventTarget | null} target the event target
 *
 * @returns {boolean} true when the target accepts text entry
 */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.closest('[contenteditable]:not([contenteditable="false"])')) return true;

  const tag: string = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Component DashboardLayoutSearch
 * @class DashboardLayoutSearch
 *
 * @description
 * Header search trigger opening a command-palette dialog (also bound to
 * Cmd/Ctrl+K) that filters the sidebar navigation destinations and navigates
 * on selection. Collapses to an icon-only button below the desktop
 * breakpoint.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-search />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-search',
  imports: [DialogModule, TooltipModule],
  templateUrl: './dashboard-layout-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class DashboardLayoutSearch {
  //#region Properties
  /**
   * Property navigationService
   * @readonly
   *
   * @description
   * Layout navigation service whose merged sections feed the palette.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  private readonly navigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to navigate to the selected destination.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property isMacLike
   * @readonly
   *
   * @description
   * Whether the platform uses the Command key, to render the matching
   * shortcut hint. Defaults to false on the server.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {boolean}
   */
  protected readonly isMacLike: boolean =
    isPlatformBrowser(inject(PLATFORM_ID)) &&
    /mac|iphone|ipad/i.test(globalThis.navigator?.platform ?? '');

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Palette dialog visibility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly visible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property query
   * @readonly
   *
   * @description
   * Current palette filter query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly query: WritableSignal<string> = signal<string>('');

  /**
   * Property entries
   * @readonly
   *
   * @description
   * All navigable destinations flattened from the sidebar sections.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<DashboardSearchEntry[]>}
   */
  private readonly entries: Signal<DashboardSearchEntry[]> = computed((): DashboardSearchEntry[] =>
    this.navigationService.menuItems().flatMap((section: MenuItem): DashboardSearchEntry[] =>
      (section.items ?? [])
        .filter((item: MenuItem): boolean => typeof item.routerLink === 'string')
        .map(
          (item: MenuItem): DashboardSearchEntry => ({
            id: item.id ?? String(item.label ?? ''),
            label: String(item.label ?? ''),
            icon: item.icon ?? null,
            section: String(section.label ?? ''),
            routerLink: item.routerLink as string,
          }),
        ),
    ),
  );

  /**
   * Property filteredEntries
   * @readonly
   *
   * @description
   * Destinations matching the current query (diacritics-insensitive).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<DashboardSearchEntry[]>}
   */
  protected readonly filteredEntries: Signal<DashboardSearchEntry[]> = computed(
    (): DashboardSearchEntry[] => {
      const normalizedQuery: string = this.normalize(this.query());
      if (!normalizedQuery) return this.entries();

      return this.entries().filter((entry: DashboardSearchEntry): boolean =>
        this.normalize(`${entry.section} ${entry.label}`).includes(normalizedQuery),
      );
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the palette with a cleared query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected open(): void {
    this.query.set('');
    this.visible.set(true);
  }

  /**
   * Method onDocumentKeydown
   * @method onDocumentKeydown
   *
   * @description
   * Toggles the palette on Cmd/Ctrl+K from anywhere in the app.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - Document keydown event.
   *
   * @returns {void}
   */
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    if (!this.visible() && isTextEntryTarget(event.target)) return;

    event.preventDefault();

    if (this.visible()) {
      this.visible.set(false);
      return;
    }
    this.open();
  }

  /**
   * Method onListKeydown
   * @method onListKeydown
   *
   * @description
   * Moves focus between palette items with the arrow keys; ArrowDown from
   * the input focuses the first item.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - Keydown event from the input or an item.
   *
   * @returns {void}
   */
  protected onListKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();

    const dialog: HTMLElement | null = (event.target as HTMLElement).closest('[role="dialog"]');
    if (!dialog) return;

    const items: HTMLButtonElement[] = [
      ...dialog.querySelectorAll<HTMLButtonElement>('[data-search-item]'),
    ];
    if (items.length === 0) return;

    const currentIndex: number = items.indexOf(event.target as HTMLButtonElement);
    const delta: number = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex: number =
      currentIndex === -1
        ? delta === 1
          ? 0
          : items.length - 1
        : (currentIndex + delta + items.length) % items.length;

    items[nextIndex].focus();
  }

  /**
   * Method onEntrySelect
   * @method onEntrySelect
   *
   * @description
   * Navigates to the selected destination and closes the palette.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {DashboardSearchEntry} entry - Selected destination.
   *
   * @returns {void}
   */
  protected onEntrySelect(entry: DashboardSearchEntry): void {
    this.visible.set(false);
    void this.router.navigateByUrl(entry.routerLink);
  }

  /**
   * Method normalize
   * @method normalize
   *
   * @description
   * Lowercases and strips diacritics for tolerant matching.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} value - Raw text.
   *
   * @returns {string} Normalized text.
   */
  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
  //#endregion
}

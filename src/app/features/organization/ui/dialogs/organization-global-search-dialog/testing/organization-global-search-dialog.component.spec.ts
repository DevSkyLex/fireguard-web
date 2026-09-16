import { APP_BASE_HREF, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  getDebugNode,
  LOCALE_ID,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationSearchHitOutput,
  OrganizationSearchOutput,
} from '@features/organization/models';
import { provideOrganizationFeature } from '@features/organization/organization.feature';
import { ActiveOrganizationStore } from '@features/organization/state';
import {
  OrganizationSearchStore,
  type OrganizationSearchStoreType,
} from '@features/organization/state/organization-search';

@Component({
  template: '<button type="button" id="search-test-opener">Open actions</button>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SearchRootTestHost {}

/**
 * Function palette
 * @description The feature-owned command rendered outside the host by the native dialog.
 * @access private
 * @since 1.0.0
 * @returns {HTMLElement | null} Live command surface, absent after dismissal.
 */
function palette(): HTMLElement | null {
  return document.querySelector('[data-testid="global-search-palette"]');
}

/**
 * Function queryInput
 * @description Native Spartan command query control in the active search dialog.
 * @access private
 * @since 1.0.0
 * @returns {HTMLInputElement} The rendered command input.
 */
function queryInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
  if (!input) throw new Error('Expected a mounted command input.');
  return input;
}

/**
 * Function paletteStore
 * @description Reads the actual dialog-scoped store to verify its injector lifetime.
 * @access private
 * @since 1.0.0
 * @returns {OrganizationSearchStoreType} Store owned by the rendered search dialog.
 */
function paletteStore(): OrganizationSearchStoreType {
  const host = document.querySelector('app-organization-global-search-dialog');
  const store = host ? getDebugNode(host)?.injector.get(OrganizationSearchStore) : null;
  if (!store) throw new Error('Expected a dialog-scoped search store.');
  return store;
}

/**
 * Function press
 * @description Sends a real bubbling keyboard event through the native dialog keyboard path.
 * @access private
 * @since 1.0.0
 * @param {string} key - Keyboard key.
 * @param {KeyboardEventInit} [init] - Additional modifiers.
 * @returns {void}
 */
function press(key: string, init: KeyboardEventInit = {}): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

describe('OrganizationGlobalSearchDialog', () => {
  let fixture: ComponentFixture<SearchRootTestHost>;
  let mobileInteractionMode: WritableSignal<boolean>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let service: { search: ReturnType<typeof vi.fn> };

  async function open(): Promise<void> {
    press('k', { ctrlKey: true });
    await fixture.whenStable();
    expect(palette()).not.toBeNull();
  }

  async function type(term: string, settle = true): Promise<void> {
    const input = queryInput();
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (settle) await new Promise((resolve) => setTimeout(resolve, 320));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    HTMLElement.prototype.scrollIntoView ??= vi.fn();
    mobileInteractionMode = signal(false);
    selectedOrganizationId = signal<string | null>('org-1');
    service = {
      search: vi
        .fn()
        .mockReturnValue(
          of({ query: 'ext', results: [{ type: 'equipment', id: 'eq-1', title: 'Brand X100' }] }),
        ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated: signal(true) } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal('desktop'),
            isMobileInteractionMode: mobileInteractionMode,
          },
        },
        provideOrganizationFeature(),
        { provide: APP_BASE_HREF, useValue: '/fr/' },
        { provide: LOCALE_ID, useValue: 'fr' },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
        { provide: OrganizationService, useValue: service },
      ],
    });
    fixture = TestBed.createComponent(SearchRootTestHost);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.focus();
  });

  it('initializes without creating a query store or fetching, then owns one fresh store per dialog', async () => {
    expect(TestBed.inject(OrganizationSearchStore, null)).toBeNull();
    expect(service.search).not.toHaveBeenCalled();
    expect(palette()).toBeNull();
    await open();
    const first = paletteStore();
    expect(first).toBeDefined();
    expect(TestBed.inject(OrganizationSearchStore, null)).toBeNull();
    expect(service.search).not.toHaveBeenCalled();
    press('Escape');
    await fixture.whenStable();
    await open();
    const second = paletteStore();
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'opens the real palette with no mounted trigger and restores prior focus for %j',
    async (init) => {
      const opener = document.activeElement;
      expect(document.querySelector('app-organization-global-search')).toBeNull();
      press('k', init);
      await fixture.whenStable();
      expect(palette()).not.toBeNull();
      expect(document.activeElement).toBe(queryInput());
      press('Escape');
      await fixture.whenStable();
      expect(palette()).toBeNull();
      expect(document.activeElement).toBe(opener);
    },
  );

  it('provides the native dialog title, description and an accessible close control', async () => {
    await open();
    const dialog = palette()?.closest('[role="dialog"]');
    const titleId = dialog?.getAttribute('aria-labelledby');
    const descriptionId = dialog?.getAttribute('aria-describedby');
    expect(titleId && document.getElementById(titleId)?.textContent).toContain(
      'Search this organization',
    );
    expect(descriptionId && document.getElementById(descriptionId)?.textContent).toContain(
      'Search equipment',
    );
    document.querySelector<HTMLButtonElement>('[aria-label="Close search"]')?.click();
    await fixture.whenStable();
    expect(palette()).toBeNull();
  });

  it('uses a public touch-sized input-group composition in the mobile interaction mode', async () => {
    mobileInteractionMode.set(true);
    await open();

    expect(
      palette()?.querySelector('[data-slot="input-group"]')?.classList.contains('min-h-11'),
    ).toBe(true);
    expect(queryInput().classList).toContain('text-base');
    expect(palette()?.querySelector('hlm-command-input')).toBeNull();
  });

  it('dismisses on the native backdrop', async () => {
    await open();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    await fixture.whenStable();
    expect(palette()).toBeNull();
  });

  it('cancels a debounced draft on Escape and starts the next dialog empty', async () => {
    await open();
    await type('ext', false);
    press('Escape');
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 320));
    expect(service.search).not.toHaveBeenCalled();
    await open();
    expect(queryInput().value).toBe('');
    expect(document.querySelector('[data-testid="global-search-hint"]')).not.toBeNull();
  });

  it('disposes an in-flight query when native dismissal starts', async () => {
    const cancel = vi.fn();
    service.search.mockReturnValue(new Observable<OrganizationSearchOutput>(() => cancel));
    await open();
    await type('ext');
    expect(document.querySelector('[data-testid="global-search-loading"]')).not.toBeNull();
    press('Escape');
    await fixture.whenStable();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('renders the existing localized error state inside the dialog', async () => {
    service.search.mockReturnValue(throwError(() => new Error('Search failed')));
    await open();
    await type('ext');
    expect(document.querySelector('[data-testid="global-search-error"]')).not.toBeNull();
  });

  it.each([
    [{ type: 'equipment', id: 'eq-1', title: 'Equipment' }, ['equipments', 'eq-1']],
    [{ type: 'facility', id: 'fa-1', title: 'Facility' }, ['facilities', 'fa-1']],
    [{ type: 'intervention', id: 'iv-1', title: 'Intervention' }, ['interventions', 'iv-1']],
    [{ type: 'inspection', id: 'in-1', title: 'Inspection' }, ['inspections', 'in-1']],
    [
      { type: 'non_conformity', id: 'nc-1', title: 'Issue', parentId: 'in-1' },
      ['inspections', 'in-1'],
    ],
    [{ type: 'non_conformity', id: 'nc-1', title: 'Issue' }, ['inspections']],
  ] satisfies readonly (readonly [OrganizationSearchHitOutput, readonly string[]])[])(
    'keeps the router-owned localized destination for %j',
    async (hit, segments) => {
      service.search.mockReturnValue(of({ query: 'ext', results: [hit] }));
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      await open();
      await type('ext');
      palette()?.querySelector<HTMLButtonElement>('button[hlmcommanditem]')?.click();
      await fixture.whenStable();
      const commands = ['/organizations', 'org-1', ...segments];
      expect(navigate).toHaveBeenCalledWith(commands);
      expect(
        TestBed.inject(Location).prepareExternalUrl(
          router.serializeUrl(router.createUrlTree(commands)),
        ),
      ).toBe('/fr/organizations/org-1/' + segments.join('/'));
      expect(palette()).toBeNull();
    },
  );

  it('retains query and result DOM through central interaction mode changes, then resets on close', async () => {
    const previous = document.documentElement.getAttribute('data-interaction-mode');
    try {
      await open();
      await type('ext');
      const input = queryInput();
      const result = palette()?.querySelector('button[hlmcommanditem]');
      document.documentElement.setAttribute('data-interaction-mode', 'mobile');
      await fixture.whenStable();
      expect(queryInput()).toBe(input);
      expect(input.value).toBe('ext');
      expect(palette()?.querySelector('button[hlmcommanditem]')).toBe(result);
      expect(service.search).toHaveBeenCalledOnce();
      press('k', { metaKey: true });
      await fixture.whenStable();
      expect(palette()).toBeNull();
      await open();
      expect(queryInput().value).toBe('');
      expect(palette()?.querySelector('button[hlmcommanditem]')).toBeNull();
    } finally {
      if (previous === null) document.documentElement.removeAttribute('data-interaction-mode');
      else document.documentElement.setAttribute('data-interaction-mode', previous);
    }
  });

  it('closes and rejects a stale result synchronously when the organization changes', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await open();
    await type('ext');
    const result = palette()?.querySelector<HTMLButtonElement>('button[hlmcommanditem]');
    selectedOrganizationId.set('org-2');
    result?.click();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
    expect(palette()).toBeNull();
  });
});

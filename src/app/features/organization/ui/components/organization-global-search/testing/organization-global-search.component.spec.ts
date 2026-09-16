import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationSearchOutput } from '@features/organization/models';
import { provideOrganizationFeature } from '@features/organization/organization.feature';
import { withGlobalSearch } from '@features/organization/providers/global-search';
import { OrganizationGlobalSearchService } from '@features/organization/services/organization-global-search';
import { ActiveOrganizationStore } from '@features/organization/state';
import { DashboardLayout } from '@layouts/dashboard-layout';
import { DASHBOARD_HEADER_ACTIONS_SLOT } from '@layouts/dashboard-layout/slots';
import { HlmDialogService } from '@shared/ui/dialog';
import { OrganizationGlobalSearch } from '../organization-global-search.component';

const RESULTS = {
  query: 'ext',
  results: [
    { type: 'equipment', id: 'eq-1', title: 'Brand X100', subtitle: 'SN-42', extra: 'Hall A' },
    { type: 'inspection', id: 'in-1', title: 'CHK-7' },
    { type: 'non_conformity', id: 'nc-1', title: 'Broken seal', subtitle: 'critical' },
  ],
} as unknown as OrganizationSearchOutput;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The palette body, which the dialog renders into an overlay outside the fixture. */
function palette(): HTMLElement | null {
  return document.querySelector('[data-testid="global-search-palette"]');
}

describe('OrganizationGlobalSearch', () => {
  let fixture: ComponentFixture<OrganizationGlobalSearch>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let service: { search: ReturnType<typeof vi.fn> };
  let router: Router;

  function trigger(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="global-search-trigger"]',
    );
  }

  async function openAndType(term: string): Promise<void> {
    trigger()?.click();
    await fixture.whenStable();

    const input: HTMLInputElement | null = document.querySelector('[data-slot="command-input"]');
    expect(input).not.toBeNull();
    if (input === null) return;

    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(320);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
    selectedOrganizationId = signal<string | null>('org-1');
    service = { search: vi.fn().mockReturnValue(of(RESULTS)) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated: signal(true) } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal('desktop'),
            isMobileInteractionMode: signal(false),
            shortcutModifier: signal<'Ctrl'>('Ctrl'),
          },
        },
        { provide: OrganizationService, useValue: service },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
      ],
    });

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(OrganizationGlobalSearch);
    await fixture.whenStable();
  });

  afterEach(() => {
    document.querySelectorAll('[data-testid="global-search-palette"]').forEach((el) => {
      el.closest('.cdk-overlay-container')?.remove();
    });
  });

  it('should render nothing without an active organization', async () => {
    selectedOrganizationId.set(null);
    await fixture.whenStable();

    expect(trigger()).toBeNull();
  });

  it('should render the trigger and advertise the shortcut', () => {
    expect(trigger()).not.toBeNull();
    expect(trigger()?.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');
    expect(trigger()?.classList.contains('mobile-ui:size-11')).toBe(true);
    expect(trigger()?.classList.contains('max-sm:size-7')).toBe(false);
  });

  it('should open the palette on Ctrl+K', async () => {
    expect(palette()).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await fixture.whenStable();

    expect(palette()).not.toBeNull();
  });

  it('should use the standard Spartan command input with comfortable vertical spacing', async () => {
    trigger()?.click();
    await fixture.whenStable();

    const commandInput: HTMLElement | null = document.querySelector('hlm-command-input');
    const inputSection: HTMLElement | null = commandInput?.parentElement ?? null;

    expect(commandInput?.querySelector('input[data-slot="command-input"]')).not.toBeNull();
    expect(commandInput?.classList.contains('p-0')).toBe(true);
    expect(inputSection?.className).toContain('py-2');
    expect(inputSection?.className).not.toContain('py-0.5');
  });

  it('keeps the command dialog and query mounted when the central CSS interaction mode changes', async () => {
    const previous = document.documentElement.getAttribute('data-interaction-mode');
    try {
      await openAndType('ext');
      const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
      const dialog = palette()?.closest('hlm-dialog-content');
      document.documentElement.setAttribute('data-interaction-mode', 'mobile');
      await fixture.whenStable();
      expect(document.querySelector('[data-slot="command-input"]')).toBe(input);
      expect(input?.value).toBe('ext');
      expect(document.querySelectorAll('app-organization-global-search-dialog')).toHaveLength(1);
      expect(dialog?.className).toContain('mobile-ui:w-screen');
      expect(dialog?.className).toContain('100dvh');
    } finally {
      if (previous === null) document.documentElement.removeAttribute('data-interaction-mode');
      else document.documentElement.setAttribute('data-interaction-mode', previous);
    }
  });

  it('should not react to Ctrl+K without an active organization', async () => {
    selectedOrganizationId.set(null);
    await fixture.whenStable();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await fixture.whenStable();

    expect(palette()).toBeNull();
  });

  it('should show the keep-typing hint before 2 characters and never dial', async () => {
    await openAndType('e');

    expect(document.querySelector('[data-testid="global-search-hint"]')).not.toBeNull();
    expect(service.search).not.toHaveBeenCalled();
  });

  it('should search debounced and render the hits grouped by type in stable order', async () => {
    await openAndType('ext');

    expect(service.search).toHaveBeenCalledTimes(1);
    expect(service.search).toHaveBeenCalledWith('org-1', 'ext');

    const groups: NodeListOf<Element> = document.querySelectorAll(
      '[data-testid^="global-search-group-"]',
    );
    expect(Array.from(groups).map((group) => group.getAttribute('data-testid'))).toEqual([
      'global-search-group-equipment',
      'global-search-group-inspection',
      'global-search-group-non_conformity',
    ]);
    expect(groups[0]?.textContent).toContain('Brand X100');
    expect(groups[0]?.textContent).toContain('SN-42');
  });

  it('should announce the settled result count politely', async () => {
    await openAndType('ext');

    const announce: HTMLElement | null = document.querySelector(
      '[data-testid="global-search-announce"]',
    );
    expect(announce?.getAttribute('aria-live')).toBe('polite');
    expect(announce?.textContent).toContain('3 results');
  });

  it('should show the no-results state on a settled empty answer', async () => {
    service.search.mockReturnValue(
      of({ query: 'zzz', results: [] } as unknown as OrganizationSearchOutput),
    );

    await openAndType('zzz');

    expect(document.querySelector('[data-testid="global-search-empty"]')).not.toBeNull();
  });

  it('should navigate to the hit detail route on selection and close the palette', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await openAndType('ext');

    const item: HTMLButtonElement | null | undefined = document
      .querySelector('[data-testid="global-search-group-equipment"]')
      ?.querySelector('button[hlmcommanditem]');
    item?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'equipments', 'eq-1']);
    expect(palette()).toBeNull();
  });

  it('should send a non-conformity hit to the inspections index — it has no detail page', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await openAndType('ext');

    const item: HTMLButtonElement | null | undefined = document
      .querySelector('[data-testid="global-search-group-non_conformity"]')
      ?.querySelector('button[hlmcommanditem]');
    item?.click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'inspections']);
  });

  it('should return focus to the trigger when the palette closes after a selection', async () => {
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await openAndType('ext');

    const item: HTMLButtonElement | null | undefined = document
      .querySelector('[data-testid="global-search-group-equipment"]')
      ?.querySelector('button[hlmcommanditem]');
    item?.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(trigger());
  });
});

describe('OrganizationGlobalSearch', () => {
  it.each(['Control+k', 'Meta+k', 'click'] as const)(
    'inherits the native parent and closes it before opening search through %s',
    async (action) => {
      HTMLElement.prototype.scrollIntoView ??= vi.fn();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideOrganizationFeature(),
          { provide: ENV_CONFIG, useValue: { appName: 'Fireguard' } },
          {
            provide: INTERACTION_CAPABILITIES_PORT,
            useValue: {
              isMobileInteractionMode: signal(true),
              shortcutModifier: signal<'Ctrl'>('Ctrl'),
            },
          },
          { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated: signal(true) } },
          {
            provide: ActiveOrganizationStore,
            useValue: { selectedOrganizationId: signal('org-1') },
          },
          {
            provide: OrganizationService,
            useValue: { search: vi.fn().mockReturnValue(of(RESULTS)) },
          },
          { provide: DASHBOARD_HEADER_ACTIONS_SLOT, useValue: [withGlobalSearch().useFactory()] },
        ],
      });
      const owner = TestBed.inject(OrganizationGlobalSearchService);
      const register = vi.spyOn(owner, 'registerTrigger');
      const fixture = TestBed.createComponent(DashboardLayout);
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      const opener = root.querySelector<HTMLButtonElement>(
        '[data-testid="dashboard-mobile-actions-trigger"]',
      );
      if (!opener) throw new Error('Expected the mobile quick-actions opener.');
      opener.focus();
      opener.click();
      await fixture.whenStable();

      const parent = register.mock.calls.at(-1)?.[1];
      expect(parent?.id).toBe('dashboard-mobile-actions');
      if (!parent) throw new Error('The native portal parent must reach the search trigger.');
      expect(parent.phase()).toBe('open');
      const dialogs = TestBed.inject(HlmDialogService);
      const nativeOpen = dialogs.open.bind(dialogs);
      const open = vi.spyOn(dialogs, 'open').mockImplementation((component, options) => {
        expect(parent.phase()).toBe('closed');
        expect(
          document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]'),
        ).toBeNull();
        return nativeOpen(component, options);
      });
      if (action === 'click') {
        document.querySelector<HTMLButtonElement>('[data-testid="global-search-trigger"]')?.click();
      } else {
        (document.activeElement ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: action === 'Control+k',
            metaKey: action === 'Meta+k',
            bubbles: true,
            cancelable: true,
          }),
        );
      }
      await fixture.whenStable();
      expect(open).toHaveBeenCalledOnce();
      expect(palette()).not.toBeNull();
      expect(document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]')).toBeNull();
      expect(document.activeElement).toBe(
        document.querySelector('#organization-global-search-query'),
      );

      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();
      expect(palette()).toBeNull();
      expect(document.activeElement).toBe(opener);
      expect(document.querySelector('[data-testid="dashboard-mobile-actions-drawer"]')).toBeNull();
    },
  );
});

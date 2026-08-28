import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationSearchOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
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
  });

  it('should open the palette on Ctrl+K', async () => {
    expect(palette()).toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    await fixture.whenStable();

    expect(palette()).not.toBeNull();
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

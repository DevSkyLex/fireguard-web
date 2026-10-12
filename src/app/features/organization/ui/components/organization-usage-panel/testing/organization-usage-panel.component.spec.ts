import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError, type StoreError } from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { OrganizationQuotaItemOutput } from '@features/organization/models';
import { OrganizationUsagePanel } from '../organization-usage-panel.component';

/**
 * Boundary this spec owns: rendering from `items`/`isLoading`/`error` and the
 * `retried` output — never a store, per `ARCHITECTURE.md` §10.3.
 */
describe('OrganizationUsagePanel', () => {
  let fixture: ComponentFixture<OrganizationUsagePanel>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (
    options: {
      items?: ReadonlyArray<OrganizationQuotaItemOutput>;
      isLoading?: boolean;
      error?: StoreError | null;
    } = {},
  ): Promise<void> => {
    fixture.componentRef.setInput('items', options.items ?? []);
    fixture.componentRef.setInput('isLoading', options.isLoading ?? false);
    fixture.componentRef.setInput('error', options.error ?? null);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('system'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
      ],
    });
    fixture = TestBed.createComponent(OrganizationUsagePanel);
  });

  it('should show a destructive alert with Retry instead of the empty state when the load fails', async () => {
    await render({ error: toStoreError(new Error('Network down')) });

    const alert: HTMLElement | null = root().querySelector(
      '[data-testid="organization-usage-error"]',
    );
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(root().querySelector('[data-testid="organization-usage-retry"]')).not.toBeNull();
    expect(root().textContent).not.toContain('No usage data is available yet.');
  });

  it('should emit retried when the error state’s Retry button is activated', async () => {
    await render({ error: toStoreError(new Error('Network down')) });
    const emitted: void[] = [];
    fixture.componentInstance.retried.subscribe((): void => {
      emitted.push(undefined);
    });

    root().querySelector<HTMLButtonElement>('[data-testid="organization-usage-retry"]')?.click();

    expect(emitted).toHaveLength(1);
  });

  it('should render the empty state only once loading has finished with no items and no error', async () => {
    await render({ items: [] });

    expect(root().querySelector('[data-testid="organization-usage-error"]')).toBeNull();
    expect(root().textContent).toContain('No usage data is available yet.');
  });

  it('renders contributed and historical quota resources with counts and a neutral explanation', async () => {
    await render({
      items: [
        { resource: 'external_reviews', used: 4, limit: 10 },
        { resource: 'constructor', used: 6, limit: null },
      ],
    });

    expect(root().textContent).toContain('external_reviews');
    expect(root().textContent).toContain('constructor');
    expect(root().textContent).toContain(
      "Usage for this resource is counted by your organization's subscription plan.",
    );
    expect(root().querySelector('hlm-progress')?.getAttribute('aria-valuenow')).toBe('40');
    expect(root().textContent).toContain('Unlimited');
  });
});

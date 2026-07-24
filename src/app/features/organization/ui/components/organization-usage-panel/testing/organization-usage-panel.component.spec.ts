import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { OrganizationQuotaItemOutput } from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationUsagePanel } from '../organization-usage-panel.component';

interface MockQuotaStore {
  items: WritableSignal<ReadonlyArray<OrganizationQuotaItemOutput>>;
  isLoadingQuota: WritableSignal<boolean>;
}

describe('OrganizationUsagePanel', () => {
  let store: MockQuotaStore;

  const createFixture = (
    items: ReadonlyArray<OrganizationQuotaItemOutput>,
    isLoadingQuota = false,
  ) => {
    store = { items: signal(items), isLoadingQuota: signal(isLoadingQuota) };
    TestBed.configureTestingModule({
      imports: [OrganizationUsagePanel],
      providers: [{ provide: OrganizationQuotaStore, useValue: store }],
    });
    const fixture = TestBed.createComponent(OrganizationUsagePanel);
    fixture.detectChanges();
    return fixture;
  };

  it('should show the loading skeleton while the quota is loading and no items exist yet', () => {
    const fixture = createFixture([], true);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-skeleton')).toBeTruthy();
  });

  it('should render usage rows once items are loaded', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 3, limit: 10 }]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-skeleton')).toBeNull();
    expect(host.textContent).toContain('3');
    expect(host.textContent).toContain('/ 10');
    expect(host.textContent).toContain('30%');
  });

  it('should render the unlimited label when the resource has no limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 5, limit: null }]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('5 used');
    expect(host.textContent).toContain('Unlimited');
  });

  it('should show the at-limit badge when usage reaches the limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 10, limit: 10 }]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('At limit');
    expect(host.querySelector('app-tag')).toBeTruthy();
  });

  it('should not show the at-limit badge when usage is below the limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 3, limit: 10 }]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('At limit');
  });

  it('should render the empty state when there are no usage rows and loading has settled', () => {
    const fixture = createFixture([], false);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Usage data is not available yet.');
  });

  it('should render a faded full track for an unlimited resource instead of a measured fill', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 5, limit: null }]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.bg-surface-300\\/60')).toBeTruthy();
  });

  it('should apply the amber near-limit fill class close to the limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 9, limit: 10 }]);
    const rows = fixture.componentInstance['rows']();

    expect(rows[0]?.fillClass).toContain('amber');
  });

  it('should apply the red full fill class at the limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 10, limit: 10 }]);
    const rows = fixture.componentInstance['rows']();

    expect(rows[0]?.fillClass).toContain('red');
  });

  it('should apply the primary fill class well below the limit', () => {
    const fixture = createFixture([{ resource: 'facilities', used: 1, limit: 10 }]);
    const rows = fixture.componentInstance['rows']();

    expect(rows[0]?.fillClass).toBe('bg-primary');
  });

  it('should render multiple usage rows', () => {
    const fixture = createFixture([
      { resource: 'facilities', used: 3, limit: 10 },
      { resource: 'equipment', used: 20, limit: 50 },
    ]);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.h-2').length).toBe(2);
  });
});

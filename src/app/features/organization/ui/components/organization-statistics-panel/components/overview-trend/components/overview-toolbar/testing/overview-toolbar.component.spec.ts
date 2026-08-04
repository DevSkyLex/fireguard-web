import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import { OverviewToolbar } from '../overview-toolbar.component';

const mockAligned = { labels: [], datasets: [[], [], []] };

const mockStore = {
  selectedGranularity: signal('day'),
  granularityOptions: signal([{ label: 'Day', value: 'day' }]),
  isQueryLoading: signal(false),
  alignedTrendData: signal(mockAligned),
  setGranularity: vi.fn(),
};

describe('OverviewToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverviewToolbar],
      providers: [{ provide: OrganizationDashboardOverviewTrendStore, useValue: mockStore }],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(OverviewToolbar);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit menuToggle when the button is clicked', () => {
    const fixture = createComponent();
    const emitSpy = vi.fn();
    fixture.componentInstance.menuToggle.subscribe(emitSpy);

    const actionButtons = fixture.nativeElement.querySelectorAll('p-button button');
    (actionButtons[1] as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should reflect the active filter count and availability on the Filters button', () => {
    const fixture = createComponent();

    fixture.componentRef.setInput('activeFilterCount', 3);
    fixture.componentRef.setInput('filtersAvailable', false);
    fixture.detectChanges();

    const actionButtons = fixture.nativeElement.querySelectorAll('p-button button');
    const filtersButton = actionButtons[0] as HTMLButtonElement;
    const badge = fixture.nativeElement.querySelector('.p-badge') as HTMLElement | null;

    expect(filtersButton.textContent?.trim()).toContain('Filters');
    expect(filtersButton.disabled).toBe(true);
    expect(badge?.classList.contains('p-badge-dot')).toBe(true);
    expect(badge?.textContent?.trim()).toBe('');
  });
});

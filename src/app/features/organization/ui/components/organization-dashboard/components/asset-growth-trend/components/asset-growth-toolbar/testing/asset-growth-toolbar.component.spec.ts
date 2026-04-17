import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { AssetGrowthToolbar } from '../asset-growth-toolbar.component';

const mockStore = {
  selectedGranularity: signal('day'),
  granularityOptions: signal([{ label: 'Day', value: 'day' }]),
  isQueryLoading: signal(false),
  setGranularity: vi.fn(),
};

describe('AssetGrowthToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AssetGrowthToolbar],
      providers: [
        { provide: OrganizationDashboardAssetGrowthStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AssetGrowthToolbar);
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
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

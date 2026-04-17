import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import { NonConformitiesOpenedToolbar } from '../non-conformities-opened-toolbar.component';

const mockStore = {
  selectedGranularity: signal<string>('week'),
  granularityOptions: signal([{ label: 'Daily', value: 'day' }, { label: 'Weekly', value: 'week' }]),
  isQueryLoading: signal(false),
  setGranularity: vi.fn(),
};

describe('NonConformitiesOpenedToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NonConformitiesOpenedToolbar],
      providers: [
        { provide: OrganizationDashboardNonConformitiesOpenedStore, useValue: mockStore },
      ],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(NonConformitiesOpenedToolbar);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the granularity select and menu button', () => {
    const fixture = createComponent();
    expect(fixture.nativeElement.querySelector('p-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p-button')).not.toBeNull();
  });

  it('should emit menuToggle when the button is clicked', () => {
    const fixture = createComponent();
    const emitSpy = vi.fn();

    fixture.componentInstance.menuToggle.subscribe(emitSpy);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

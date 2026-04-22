import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OrganizationDashboardEquipmentCreatedStore } from '@features/organization/state/organization-dashboard';
import { EquipmentCreatedToolbar } from '../equipment-created-toolbar.component';

const mockStore = {
  selectedGranularity: signal<string>('week'),
  granularityOptions: signal([
    { label: 'Daily', value: 'day' },
    { label: 'Weekly', value: 'week' },
  ]),
  isQueryLoading: signal(false),
  setGranularity: vi.fn(),
};

describe('EquipmentCreatedToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EquipmentCreatedToolbar],
      providers: [{ provide: OrganizationDashboardEquipmentCreatedStore, useValue: mockStore }],
    });
  });

  function createComponent() {
    const fixture = TestBed.createComponent(EquipmentCreatedToolbar);
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

    const actionButtons = fixture.nativeElement.querySelectorAll('p-button button');
    (actionButtons[1] as HTMLButtonElement).click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

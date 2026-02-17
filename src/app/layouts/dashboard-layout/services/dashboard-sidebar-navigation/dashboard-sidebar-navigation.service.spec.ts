import { TestBed } from '@angular/core/testing';
import { DashboardSidebarNavigationService } from './dashboard-sidebar-navigation.service';

describe('DashboardSidebarNavigationService', () => {
  let service: DashboardSidebarNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardSidebarNavigationService],
    });

    service = TestBed.inject(DashboardSidebarNavigationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should expose the full menu by default', () => {
    const labels = service.menuItems().map((item) => item.label);

    expect(labels).toEqual(['Home', 'Organization']);
  });

  it('should filter menu items by query while keeping parent nodes', () => {
    service.setSearchQuery('Reports');

    const menuItems = service.menuItems();
    const rootLabels = menuItems.map((item) => item.label);
    const organization = menuItems.find((item) => item.label === 'Organization');
    const reportItem = organization?.items?.find((item) => item.label === 'Reports');

    expect(rootLabels).toEqual(['Organization']);
    expect(reportItem).toBeDefined();
  });

  it('should clear the query and restore full menu', () => {
    service.setSearchQuery('Reports');
    expect(service.menuItems().map((item) => item.label)).toEqual(['Organization']);

    service.clearSearchQuery();
    expect(service.menuItems().map((item) => item.label)).toEqual(['Home', 'Organization']);
  });
});

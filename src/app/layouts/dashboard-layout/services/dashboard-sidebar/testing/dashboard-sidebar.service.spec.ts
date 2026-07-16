import { TestBed } from '@angular/core/testing';
import { DashboardSidebarService } from '../dashboard-sidebar.service';

describe('DashboardSidebarService', () => {
  let service: DashboardSidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardSidebarService],
    });

    service = TestBed.inject(DashboardSidebarService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should open, close and toggle drawer visibility', () => {
    expect(service.visible()).toBe(false);

    service.open();
    expect(service.visible()).toBe(true);

    service.close();
    expect(service.visible()).toBe(false);

    service.toggle();
    expect(service.visible()).toBe(true);
  });

  it('should set drawer visibility explicitly', () => {
    service.setVisible(true);
    expect(service.visible()).toBe(true);

    service.setVisible(false);
    expect(service.visible()).toBe(false);
  });

  it('should toggle the primary sidebar collapsed state', () => {
    expect(service.primaryCollapsed()).toBe(false);

    service.togglePrimaryCollapsed();
    expect(service.primaryCollapsed()).toBe(true);

    service.togglePrimaryCollapsed();
    expect(service.primaryCollapsed()).toBe(false);
  });

  it('should set the primary sidebar collapsed state explicitly', () => {
    service.setPrimaryCollapsed(true);
    expect(service.primaryCollapsed()).toBe(true);

    service.setPrimaryCollapsed(false);
    expect(service.primaryCollapsed()).toBe(false);
  });
});

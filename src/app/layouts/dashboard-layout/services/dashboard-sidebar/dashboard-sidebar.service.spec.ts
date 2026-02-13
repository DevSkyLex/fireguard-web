import { TestBed } from '@angular/core/testing';
import { DashboardSidebarService } from './dashboard-sidebar.service';

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

  it('should clamp width when setting it directly', () => {
    service.setWidth(DashboardSidebarService.MIN_WIDTH - 50);
    expect(service.width()).toBe(DashboardSidebarService.MIN_WIDTH);

    service.setWidth(DashboardSidebarService.MAX_WIDTH + 50);
    expect(service.width()).toBe(DashboardSidebarService.MAX_WIDTH);
  });

  it('should clamp width when adjusting it', () => {
    service.setWidth(DashboardSidebarService.DEFAULT_WIDTH);

    service.adjustWidth(500);
    expect(service.width()).toBe(DashboardSidebarService.MAX_WIDTH);

    service.adjustWidth(-500);
    expect(service.width()).toBe(DashboardSidebarService.MIN_WIDTH);
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
});

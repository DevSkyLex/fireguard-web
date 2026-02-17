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
    service.setWidth(service.minWidth() - 50);
    expect(service.width()).toBe(service.minWidth());

    service.setWidth(service.maxWidth() + 50);
    expect(service.width()).toBe(service.maxWidth());
  });

  it('should clamp width when adjusting it', () => {
    service.setWidth(service.defaultWidth());

    service.adjustWidth(500);
    expect(service.width()).toBe(service.maxWidth());

    service.adjustWidth(-500);
    expect(service.width()).toBe(service.minWidth());
  });

  it('should allow updating default, min and max width signals', () => {
    service.minWidth.set(240);
    service.maxWidth.set(420);
    service.defaultWidth.set(360);

    expect(service.minWidth()).toBe(240);
    expect(service.maxWidth()).toBe(420);
    expect(service.defaultWidth()).toBe(360);

    service.setWidth(200);
    expect(service.width()).toBe(240);

    service.setWidth(500);
    expect(service.width()).toBe(420);
  });

  it('should keep width bounded when constraints are updated', () => {
    service.setWidth(400);
    service.maxWidth.set(320);
    expect(service.width()).toBe(320);

    service.minWidth.set(340);
    expect(service.width()).toBe(340);
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

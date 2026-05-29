import { TestBed } from '@angular/core/testing';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarHeader } from '../dashboard-layout-sidebar-header.component';

describe('DashboardLayoutSidebarHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarHeader],
      providers: [DashboardSidebarService],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render sidebar branding', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarHeader);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fireguard');
  });
});

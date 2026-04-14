import { TestBed } from '@angular/core/testing';
import { DashboardLayoutSidebarHeader } from '../dashboard-layout-sidebar-header.component';

describe('DashboardLayoutSidebarHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarHeader],
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


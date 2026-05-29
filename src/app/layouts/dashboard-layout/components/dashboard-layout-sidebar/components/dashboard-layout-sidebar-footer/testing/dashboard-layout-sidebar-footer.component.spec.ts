import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DashboardLayoutSidebarFooter } from '../dashboard-layout-sidebar-footer.component';

describe('DashboardLayoutSidebarFooter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebarFooter],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarFooter);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the copyright in the sidebar footer', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebarFooter);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('section'))).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('2026 Fireguard, Inc.');
  });
});

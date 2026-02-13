import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebar } from './dashboard-layout-sidebar.component';

describe('DashboardLayoutSidebar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutSidebar],
      providers: [
        DashboardSidebarService,
        provideRouter([]),
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render configured navigation items', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links.length).toBe(1);
    expect(links[0].nativeElement.textContent).toContain('Home');
  });

  it('should close sidebar on navigation click', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');

    fixture.detectChanges();
    const firstLink = fixture.debugElement.query(By.css('a'));
    firstLink.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});

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

  it('should render branding and section labels', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    fixture.detectChanges();

    const panelMenus = fixture.debugElement.queryAll(By.css('p-panelmenu'));
    expect(panelMenus.length).toBe(2);

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Fireguard');
    expect(textContent).toContain('Home');
    expect(textContent).toContain('Dashboard');
    expect(textContent).toContain('Organization');
    expect(textContent).toContain('Security');
  });

  it('should configure notification badges in menu model', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    const component = fixture.componentInstance as unknown as {
      readonly menuGroups: readonly {
        readonly id: string;
        readonly items: readonly {
          readonly items?: readonly {
            readonly label?: string;
            readonly badge?: string;
            readonly items?: readonly {
              readonly label?: string;
              readonly badge?: string;
            }[];
          }[];
        }[];
      }[];
    };

    const homeGroup = component.menuGroups.find((group) => group.id === 'home');
    const organizationGroup = component.menuGroups.find((group) => group.id === 'organization');
    const homeItems = homeGroup?.items[0].items ?? [];
    const organizationItems = organizationGroup?.items[0].items ?? [];
    const securityItems = organizationItems.find((item) => item.label === 'Security')?.items ?? [];
    const bookmarks = homeItems.find((item) => item.label === 'Bookmarks');
    const messages = homeItems.find((item) => item.label === 'Messages');
    const reports = securityItems.find((item) => item.label === 'Reports');

    expect(bookmarks?.badge).toBe('3');
    expect(messages?.badge).toBe('1');
    expect(reports?.badge).toBe('4');
  });

  it('should close sidebar when a leaf command is executed', () => {
    const fixture = TestBed.createComponent(DashboardLayoutSidebar);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const closeSpy = vi.spyOn(sidebarService, 'close');
    const component = fixture.componentInstance as unknown as {
      readonly menuGroups: readonly {
        readonly id: string;
        readonly items: readonly {
          readonly items?: readonly {
            readonly label?: string;
            readonly command?: () => void;
          }[];
        }[];
      }[];
    };

    const homeGroup = component.menuGroups.find((group) => group.id === 'home');
    const homeItems = homeGroup?.items[0].items ?? [];
    const dashboardItem = homeItems.find((item) => item.label === 'Dashboard');
    dashboardItem?.command?.();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});

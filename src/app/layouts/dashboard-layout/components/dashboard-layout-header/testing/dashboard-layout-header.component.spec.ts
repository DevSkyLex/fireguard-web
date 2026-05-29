import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/ports/theme';
import { BreadcrumbService } from '@core/services/breadcrumb';
import {
  DashboardHeaderActionsService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutHeader } from '../dashboard-layout-header.component';

@Component({
  selector: 'app-test-header-action-a',
  standalone: true,
  template: '<button type="button">Action A</button>',
})
class TestHeaderActionA {}

@Component({
  selector: 'app-test-header-action-b',
  standalone: true,
  template: '<button type="button">Action B</button>',
})
class TestHeaderActionB {}

describe('DashboardLayoutHeader', () => {
  const currentTheme = signal<ThemeMode>('light');
  const mockThemePort: ThemePort = {
    theme: currentTheme,
    setTheme: vi.fn((mode: ThemeMode) => currentTheme.set(mode)),
  };
  const mockHeaderActionsService: { components: Type<unknown>[] } = {
    components: [],
  };

  beforeEach(() => {
    mockHeaderActionsService.components = [];

    TestBed.configureTestingModule({
      imports: [DashboardLayoutHeader],
      providers: [
        DashboardSidebarService,
        BreadcrumbService,
        provideRouter([]),
        { provide: THEME_PORT, useValue: mockThemePort },
        { provide: DashboardHeaderActionsService, useValue: mockHeaderActionsService },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open sidebar when menu button is clicked', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);
    const sidebarService = TestBed.inject(DashboardSidebarService);
    const openSpy = vi.spyOn(sidebarService, 'open');

    fixture.detectChanges();
    const menuButton = fixture.debugElement.query(By.css('p-button'));
    menuButton.triggerEventHandler('onClick', new MouseEvent('click'));

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-dashboard-layout-breadcrumb'))).toBeTruthy();
  });

  it('should render a vertical divider between header actions', () => {
    mockHeaderActionsService.components = [TestHeaderActionA, TestHeaderActionB];
    const fixture = TestBed.createComponent(DashboardLayoutHeader);

    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('p-divider[layout="vertical"]'))).toHaveLength(1);
  });
});

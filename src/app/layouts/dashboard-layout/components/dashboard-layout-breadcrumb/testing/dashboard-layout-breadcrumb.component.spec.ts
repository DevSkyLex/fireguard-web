import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BreadcrumbService } from '@core/breadcrumb';
import { DashboardLayoutBreadcrumb } from '../dashboard-layout-breadcrumb.component';

describe('DashboardLayoutBreadcrumb', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutBreadcrumb],
      providers: [BreadcrumbService, provideRouter([])],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardLayoutBreadcrumb);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render breadcrumb navigation', () => {
    const fixture = TestBed.createComponent(DashboardLayoutBreadcrumb);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('p-breadcrumb'))).toBeTruthy();
  });
});

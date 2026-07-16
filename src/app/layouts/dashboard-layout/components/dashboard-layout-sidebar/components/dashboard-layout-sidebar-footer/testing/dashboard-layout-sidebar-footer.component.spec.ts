import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { SidebarContribution } from '@layouts/dashboard-layout/slots/sidebar';
import { DashboardLayoutSidebarFooter } from '../dashboard-layout-sidebar-footer.component';

@Component({ template: '<div data-testid="footer-widget-stub"></div>' })
class FooterWidgetStub {}

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

  it('should render the given footer contributions', () => {
    const contributions: SidebarContribution[] = [
      { id: 'stub', order: 10, region: 'footer', component: FooterWidgetStub },
    ];

    const fixture = TestBed.createComponent(DashboardLayoutSidebarFooter);
    fixture.componentRef.setInput('contributions', contributions);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('section'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="footer-widget-stub"]'))).toBeTruthy();
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { DashboardPageHeaderService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutContent } from '../dashboard-layout-content.component';

@Component({
  standalone: true,
  imports: [DashboardLayoutContent],
  template: `
    <app-dashboard-layout-content>
      <div data-testid="projected-content">Projected content</div>
    </app-dashboard-layout-content>
  `,
})
class HostComponent {}

describe('DashboardLayoutContent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [DashboardLayoutContent],
      providers: [DashboardPageHeaderService, provideRouter([])],
    });

    const fixture = TestBed.createComponent(DashboardLayoutContent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should project content', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [DashboardPageHeaderService, provideRouter([])],
    });

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const projected = fixture.debugElement.query(By.css('[data-testid="projected-content"]'));
    expect(projected).not.toBeNull();
  });
});

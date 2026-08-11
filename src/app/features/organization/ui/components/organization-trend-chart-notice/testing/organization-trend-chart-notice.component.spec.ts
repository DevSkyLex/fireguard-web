import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import { OrganizationTrendChartNotice } from '../organization-trend-chart-notice.component';

describe('OrganizationTrendChartNotice', () => {
  let fixture: ComponentFixture<OrganizationTrendChartNotice>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideIcons({ lucideTriangleAlert })],
    });

    fixture = TestBed.createComponent(OrganizationTrendChartNotice);
    fixture.componentRef.setInput('icon', 'lucideTriangleAlert');
    fixture.componentRef.setInput('message', 'This chart could not be loaded.');
    await fixture.whenStable();
  });

  it('renders the icon and the message', () => {
    expect(fixture.nativeElement.querySelector('ng-icon')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('This chart could not be loaded.');
  });

  it('renders no action when the caller projects none', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('announces as a status region by default', () => {
    expect(fixture.nativeElement.getAttribute('role')).toBe('status');
  });

  it('announces as an alert when the variant is error', async () => {
    fixture.componentRef.setInput('variant', 'error');
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('role')).toBe('alert');
  });
});

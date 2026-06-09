import { Component, signal, type Type, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardPageHeaderService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutPageHeader } from '../dashboard-layout-page-header.component';

@Component({ selector: 'test-export-action', template: '<button>Export</button>' })
class TestExportAction {}

describe('DashboardLayoutPageHeader', () => {
  const createComponent = (title: string | null, actions: Type<unknown>[] = []) => {
    const titleSignal: WritableSignal<string | null> = signal(title);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutPageHeader],
      providers: [
        { provide: DashboardPageHeaderService, useValue: { title: titleSignal, actions } },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutPageHeader);
    fixture.detectChanges();
    return { fixture, titleSignal };
  };

  it('should render nothing when there is no title', () => {
    const { fixture } = createComponent(null);

    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('should render the title', () => {
    const { fixture } = createComponent('Account');

    expect(fixture.nativeElement.textContent ?? '').toContain('Account');
  });

  it('should not render an action slot when there are no actions', () => {
    const { fixture } = createComponent('Account', []);

    expect(fixture.nativeElement.querySelector('test-export-action')).toBeNull();
  });

  it('should render slot action components on the right', () => {
    const { fixture } = createComponent('Settings', [TestExportAction]);

    expect(fixture.nativeElement.querySelector('test-export-action')).toBeTruthy();
    expect(fixture.nativeElement.textContent ?? '').toContain('Export');
  });
});

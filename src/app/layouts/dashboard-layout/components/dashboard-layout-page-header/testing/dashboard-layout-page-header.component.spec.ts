import { Component, signal, type Type, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardPageHeaderService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutPageHeader } from '../dashboard-layout-page-header.component';

@Component({ selector: 'test-export-action', template: '<button>Export</button>' })
class TestExportAction {}

describe('DashboardLayoutPageHeader', () => {
  const createComponent = (
    title: string | null,
    actions: Type<unknown>[] = [],
    description: string | null = null,
  ) => {
    const titleSignal: WritableSignal<string | null> = signal(title);
    const descriptionSignal: WritableSignal<string | null> = signal(description);

    TestBed.configureTestingModule({
      imports: [DashboardLayoutPageHeader],
      providers: [
        {
          provide: DashboardPageHeaderService,
          useValue: { title: titleSignal, description: descriptionSignal, actions },
        },
      ],
    });

    const fixture = TestBed.createComponent(DashboardLayoutPageHeader);
    fixture.detectChanges();
    return { fixture, titleSignal, descriptionSignal };
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

  // Every prototype page carries a title *and* a sentence saying what it is
  // for; the banner used to render only the title.
  it('should render the description under the title', () => {
    const { fixture } = createComponent('Overview', [], 'Your operations at a glance.');

    expect(fixture.nativeElement.textContent).toContain('Your operations at a glance.');
  });

  it('should render nothing but the title when there is no description', () => {
    const { fixture } = createComponent('Overview');

    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });
});

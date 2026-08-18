import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageActionsService } from '@core/page-actions';
import { TitleService } from '@core/title';
import { DashboardPageHeader } from '../dashboard-page-header.component';

describe('DashboardPageHeader', () => {
  let fixture: ComponentFixture<DashboardPageHeader>;
  let pageTitle: WritableSignal<string>;

  beforeEach(async () => {
    pageTitle = signal<string>('');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: TitleService, useValue: { pageTitle } },
        { provide: PageActionsService, useValue: { actions: signal(null) } },
      ],
    });

    fixture = TestBed.createComponent(DashboardPageHeader);
    await fixture.whenStable();
  });

  it('renders no heading while the activated route has no title', () => {
    const heading: HTMLElement | null = fixture.nativeElement.querySelector('h1');

    expect(heading).toBeNull();
  });

  it("renders the activated route's title as the document heading", async () => {
    pageTitle.set('Dashboard');
    await fixture.whenStable();

    const heading: HTMLElement | null = fixture.nativeElement.querySelector('h1');

    expect(heading?.textContent?.trim()).toBe('Dashboard');
  });

  it('reacts to a title change on navigation', async () => {
    pageTitle.set('Dashboard');
    await fixture.whenStable();

    pageTitle.set('Members');
    await fixture.whenStable();

    const heading: HTMLElement | null = fixture.nativeElement.querySelector('h1');

    expect(heading?.textContent?.trim()).toBe('Members');
  });
});

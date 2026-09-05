import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  type WritableSignal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageTabsService } from '@core/page-tabs';
import { DashboardPageTabs } from '../dashboard-page-tabs.component';

@Component({
  selector: 'app-page-tabs-host',
  imports: [DashboardPageTabs],
  template: `
    <ng-template #stub><nav data-testid="stub-tabs">Tabs</nav></ng-template>
    <app-dashboard-page-tabs />
  `,
})
class HostComponent {
  public readonly stub = viewChild.required<TemplateRef<unknown>>('stub');
}

describe('DashboardPageTabs', () => {
  let fixture: ComponentFixture<HostComponent>;
  let tabs: WritableSignal<TemplateRef<unknown> | null>;

  beforeEach(async () => {
    tabs = signal<TemplateRef<unknown> | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PageTabsService, useValue: { tabs } },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should render no tab row without a registered page template', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="stub-tabs"]')).toBeNull();
  });

  it('should render and clear the registered page template', async () => {
    tabs.set(fixture.componentInstance.stub());
    await fixture.whenStable();
    const renderedTabs: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="stub-tabs"]',
    );
    const orientationHost: HTMLElement | null =
      renderedTabs?.closest<HTMLElement>('[data-orientation="horizontal"]') ?? null;

    expect(renderedTabs).not.toBeNull();
    expect(orientationHost?.classList.contains('group/tabs')).toBe(true);

    tabs.set(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="stub-tabs"]')).toBeNull();
  });
});

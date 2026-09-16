import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  type WritableSignal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageTabsService } from '@core/page-tabs';
import { HlmTabsImports, HlmTabsPaginatedList } from '@shared/ui/tabs';
import { DashboardPageTabs } from '../dashboard-page-tabs.component';

@Component({
  selector: 'app-page-tabs-host',
  imports: [DashboardPageTabs, HlmTabsImports],
  template: `
    <hlm-tabs tab="overview">
      <ng-template #stub>
        <hlm-paginated-tabs-list
          variant="line"
          tabListClass="py-0 mobile-ui:min-h-11"
          paginationButtonClass="mobile-ui:size-11"
          aria-label="Page sections"
          data-testid="stub-tabs"
        >
          <button hlmTabsTrigger="overview" class="mobile-ui:min-h-11">Overview</button>
          <button hlmTabsTrigger="details" class="mobile-ui:min-h-11">Details</button>
        </hlm-paginated-tabs-list>
      </ng-template>
      <div hlmTabsContent="overview">Overview content</div>
      <div hlmTabsContent="details">Details content</div>
    </hlm-tabs>
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
    expect(orientationHost?.classList.contains('-mb-px')).toBe(true);
    expect(orientationHost?.classList.contains('desktop-ui:[&_[role=tab]]:px-3')).toBe(true);
    expect(orientationHost?.classList.contains('desktop-ui:[&_[role=tab]]:py-1')).toBe(false);
    expect(orientationHost?.classList.contains('[&_[role=tab]]:after:bottom-[-1px]')).toBe(true);
    expect(orientationHost?.classList.contains('[&_[role=tab]]:after:bottom-[-2px]')).toBe(false);
    expect(orientationHost?.classList.contains('pb-1')).toBe(false);

    tabs.set(null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid="stub-tabs"]')).toBeNull();
  });

  it('keeps projected native tab inputs and activation connected to their declaring page', async () => {
    tabs.set(fixture.componentInstance.stub());
    await fixture.whenStable();
    const list: HlmTabsPaginatedList = fixture.debugElement.query(
      By.directive(HlmTabsPaginatedList),
    ).componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

    expect(list.variant()).toBe('line');
    expect(list.tabListClass()).toBe('py-0 mobile-ui:min-h-11');
    expect(list.paginationButtonClass()).toBe('mobile-ui:size-11');
    expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Page sections',
    );
    expect(triggers).toHaveLength(2);
    expect(triggers[0]?.getAttribute('aria-selected')).toBe('true');

    triggers[1]?.click();
    await fixture.whenStable();
    expect(triggers[0]?.getAttribute('aria-selected')).toBe('false');
    expect(triggers[1]?.getAttribute('aria-selected')).toBe('true');
  });
});

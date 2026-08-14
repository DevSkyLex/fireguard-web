import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type TemplateRef,
  type WritableSignal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageActionsService } from '@core/page-actions';
import { DashboardPageActions } from '../dashboard-page-actions.component';

@Component({
  selector: 'app-page-actions-host',
  imports: [DashboardPageActions],
  template: `
    <ng-template #stub>
      <button data-testid="stub-action" type="button">Do it</button>
    </ng-template>
    <app-dashboard-page-actions />
  `,
})
class HostComponent {
  public readonly stub = viewChild.required<TemplateRef<unknown>>('stub');
}

describe('DashboardPageActions', () => {
  let fixture: ComponentFixture<HostComponent>;
  let actions: WritableSignal<TemplateRef<unknown> | null>;

  beforeEach(async () => {
    actions = signal<TemplateRef<unknown> | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PageActionsService, useValue: { actions } },
      ],
    });

    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('should render nothing when no page has registered a template', () => {
    const rendered = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="stub-action"]',
    );

    expect(rendered).toBeNull();
  });

  it("should render the registered template's content", async () => {
    actions.set(fixture.componentInstance.stub());
    await fixture.whenStable();

    const rendered = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="stub-action"]',
    );

    expect(rendered).not.toBeNull();
    expect(rendered?.textContent?.trim()).toBe('Do it');
  });

  it('should stop rendering once the template is cleared', async () => {
    actions.set(fixture.componentInstance.stub());
    await fixture.whenStable();

    actions.set(null);
    await fixture.whenStable();

    const rendered = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="stub-action"]',
    );

    expect(rendered).toBeNull();
  });
});

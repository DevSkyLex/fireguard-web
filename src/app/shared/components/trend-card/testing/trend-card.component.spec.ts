import { Component, signal, type WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { MetricSummary } from '../models';
import { TrendCard } from '../trend-card.component';

/**
 * Host harness projecting the `#content`, `#action` and `#footer` templates
 * `TrendCard` consumes via `contentChild`. A plain `TestBed.createComponent`
 * of `TrendCard` alone cannot exercise those branches — there is nothing to
 * project — which is why the component template rendered at ~13% coverage
 * everywhere it was stubbed with `CUSTOM_ELEMENTS_SCHEMA`.
 */
@Component({
  selector: 'app-trend-card-host',
  imports: [TrendCard],
  template: `
    <app-trend-card
      [title]="title()"
      [description]="description()"
      [metrics]="metrics()"
      [loading]="loading()"
    >
      @if (withAction()) {
        <ng-template #action>
          <button type="button">Action</button>
        </ng-template>
      }
      <ng-template #content>
        <p>Projected content</p>
      </ng-template>
      <ng-template #footer>
        @if (withFooter()) {
          <p>Projected footer</p>
        }
      </ng-template>
    </app-trend-card>
  `,
})
class TrendCardHost {
  public readonly title: WritableSignal<string> = signal('Inspections');
  public readonly description: WritableSignal<string | undefined> = signal<string | undefined>(
    undefined,
  );
  public readonly metrics: WritableSignal<readonly MetricSummary[]> = signal<
    readonly MetricSummary[]
  >([]);
  public readonly loading: WritableSignal<boolean> = signal(false);
  public readonly withAction: WritableSignal<boolean> = signal(false);
  public readonly withFooter: WritableSignal<boolean> = signal(false);
}

/** Host with no `#footer`/`#action` templates at all, for the "not provided" branches. */
@Component({
  selector: 'app-trend-card-bare-host',
  imports: [TrendCard],
  template: `
    <app-trend-card [title]="'Inspections'">
      <ng-template #content>
        <p>Projected content</p>
      </ng-template>
    </app-trend-card>
  `,
})
class TrendCardBareHost {}

describe('TrendCard', () => {
  let fixture: ComponentFixture<TrendCardHost>;

  function build(): TrendCardHost {
    fixture = TestBed.createComponent(TrendCardHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('should render the title and projected content', () => {
    const host = build();
    host.title.set('Inspection quality');
    fixture.detectChanges();

    const heading = fixture.debugElement.query(By.css('h2'));
    expect(heading.nativeElement.textContent.trim()).toBe('Inspection quality');
    expect(fixture.nativeElement.textContent).toContain('Projected content');
  });

  it('should not render a description when none is provided', () => {
    build();

    expect(fixture.debugElement.query(By.css('p.text-sm'))).toBeNull();
  });

  it('should render the description when provided', () => {
    const host = build();
    host.description.set('Last 30 days');
    fixture.detectChanges();

    const description = fixture.debugElement.query(By.css('p.text-sm'));
    expect(description.nativeElement.textContent.trim()).toBe('Last 30 days');
  });

  it('should not render the metrics bar when there are no metrics and it is not loading', () => {
    build();

    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeNull();
    expect(fixture.debugElement.query(By.css('.grid'))).toBeNull();
  });

  it('should render skeleton placeholders while loading', () => {
    const host = build();
    host.loading.set(true);
    fixture.detectChanges();

    const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
    // Two skeletons (value + label) per placeholder cell, four cells.
    expect(skeletons.length).toBe(8);
  });

  it('should render each metric with its label and value', () => {
    const host = build();
    host.metrics.set([
      { label: 'Total', value: '128', icon: null },
      { label: 'Failed', value: '4', icon: null },
    ]);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent as string;
    expect(text).toContain('Total');
    expect(text).toContain('128');
    expect(text).toContain('Failed');
    expect(text).toContain('4');
  });

  it('should render an upward comparison with its accessible label', () => {
    const host = build();
    host.metrics.set([
      { label: 'Total', value: '128', icon: null, comparison: { value: '+12%', direction: 'up' } },
    ]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.pi-arrow-up-right'))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('increased');
  });

  it('should render a downward comparison with its accessible label', () => {
    const host = build();
    host.metrics.set([
      {
        label: 'Total',
        value: '128',
        icon: null,
        comparison: { value: '-3%', direction: 'down' },
      },
    ]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.pi-arrow-down-right'))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('decreased');
  });

  it('should render a neutral comparison fallback for an unknown direction', () => {
    const host = build();
    host.metrics.set([
      {
        label: 'Total',
        value: '128',
        icon: null,
        comparison: { value: '0%', direction: 'flat' },
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no change');
  });

  it('should not render a comparison row when the metric has none', () => {
    const host = build();
    host.metrics.set([{ label: 'Total', value: '128', icon: null }]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.pi-arrow-up-right'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.pi-arrow-down-right'))).toBeNull();
  });

  it('should project the action template when provided', () => {
    const host = build();
    host.withAction.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('button'))?.nativeElement.textContent.trim()).toBe(
      'Action',
    );
  });

  it('should project the footer template when provided', () => {
    const host = build();
    host.withFooter.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Projected footer');
  });

  it('should not render footer content when the footer template renders nothing', () => {
    build();

    expect(fixture.nativeElement.textContent).not.toContain('Projected footer');
  });

  describe('without action or footer templates', () => {
    let bareFixture: ComponentFixture<TrendCardBareHost>;

    beforeEach(() => {
      bareFixture = TestBed.createComponent(TrendCardBareHost);
      bareFixture.detectChanges();
    });

    it('should not render an action slot when no action template is provided', () => {
      expect(bareFixture.debugElement.query(By.css('button'))).toBeNull();
    });

    it('should render content without a footer when no footer template is provided', () => {
      expect(bareFixture.nativeElement.textContent).toContain('Projected content');
    });
  });
});

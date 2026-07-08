import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MetricCard } from '@shared/components';
import { InterventionMetric } from '../intervention-metric.component';

describe('InterventionMetric', () => {
  function createComponent(): {
    readonly component: InterventionMetric;
    readonly detectChanges: () => void;
    readonly metricCard: () => MetricCard;
    readonly hostElement: () => HTMLElement;
  } {
    TestBed.configureTestingModule({ imports: [InterventionMetric] });

    const fixture = TestBed.createComponent(InterventionMetric);
    fixture.componentRef.setInput('variant', 'in_progress');
    fixture.componentRef.setInput('title', 'In progress');
    fixture.componentRef.setInput('description', 'Field work underway');
    fixture.componentRef.setInput('icon', 'pi pi-wrench');
    fixture.componentRef.setInput('value', 4);

    return {
      component: fixture.componentInstance,
      detectChanges: () => fixture.detectChanges(),
      metricCard: () => fixture.debugElement.query(By.directive(MetricCard)).componentInstance,
      hostElement: () => fixture.nativeElement as HTMLElement,
    };
  }

  it('should create', () => {
    const { component, detectChanges } = createComponent();
    detectChanges();

    expect(component).toBeTruthy();
  });

  it('should forward title, description, icon, value and loading to the shared MetricCard', () => {
    const { detectChanges, metricCard } = createComponent();
    detectChanges();

    const card = metricCard();
    expect(card.title()).toBe('In progress');
    expect(card.description()).toBe('Field work underway');
    expect(card.icon()).toBe('pi pi-wrench');
    expect(card.value()).toBe(4);
    expect(card.loading()).toBe(false);
  });

  it('should reflect the variant as a data attribute for stable targeting', () => {
    const { detectChanges, hostElement } = createComponent();
    detectChanges();

    expect(hostElement().getAttribute('data-variant')).toBe('in_progress');
  });

  it('should forward the loading flag to the shared MetricCard', () => {
    TestBed.configureTestingModule({ imports: [InterventionMetric] });
    const fixture = TestBed.createComponent(InterventionMetric);
    fixture.componentRef.setInput('variant', 'published');
    fixture.componentRef.setInput('title', 'Published');
    fixture.componentRef.setInput('icon', 'pi pi-check-circle');
    fixture.componentRef.setInput('value', 0);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.directive(MetricCard))
      .componentInstance as MetricCard;
    expect(card.loading()).toBe(true);
  });
});

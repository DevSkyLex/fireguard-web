import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardLayoutSlotOutlet } from '../dashboard-layout-slot-outlet.component';

@Component({ selector: 'test-eager-widget', template: '<span>eager</span>' })
class TestEagerWidget {}

@Component({ selector: 'test-lazy-widget', template: '<span>lazy</span>' })
class TestLazyWidget {}

describe('DashboardLayoutSlotOutlet', () => {
  const createComponent = () => {
    TestBed.configureTestingModule({ imports: [DashboardLayoutSlotOutlet] });

    return TestBed.createComponent(DashboardLayoutSlotOutlet);
  };

  it('should render an eager component immediately', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('source', { component: TestEagerWidget });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('test-eager-widget')).toBeTruthy();
  });

  it('should render nothing until a deferred component resolves', async () => {
    let resolveLoader: (component: Type<unknown>) => void = () => undefined;
    const loaded: Promise<Type<unknown>> = new Promise<Type<unknown>>((resolve) => {
      resolveLoader = resolve;
    });

    const fixture = createComponent();
    fixture.componentRef.setInput('source', { loadComponent: () => loaded });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('test-lazy-widget')).toBeNull();

    resolveLoader(TestLazyWidget);
    await loaded;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('test-lazy-widget')).toBeTruthy();
  });
});

import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfiniteScrollDirective } from '../infinite-scroll.directive';

class MockIntersectionObserver {
  public static instances: MockIntersectionObserver[] = [];

  public readonly observe = vi.fn();
  public readonly disconnect = vi.fn();

  public constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  public trigger(entry: Partial<IntersectionObserverEntry>): void {
    const target = document.createElement('div');

    this.callback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: entry.intersectionRatio ?? 1,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting: entry.isIntersecting ?? false,
          rootBounds: null,
          target,
          time: entry.time ?? 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }

  public static reset(): void {
    MockIntersectionObserver.instances = [];
  }
}

@Component({
  template:
    '<div appInfiniteScroll [disabled]="disabled" [rootMargin]="rootMargin" (scrolled)="handleScrolled()"></div>',
  imports: [InfiniteScrollDirective],
})
class TestHostComponent {
  public disabled = false;
  public rootMargin = '120px';
  public scrolledCount = 0;

  public handleScrolled(): void {
    this.scrolledCount += 1;
  }
}

describe('InfiniteScrollDirective', () => {
  beforeEach(() => {
    MockIntersectionObserver.reset();
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver as unknown as typeof IntersectionObserver,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create an observer with the configured root margin', () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0]?.options).toEqual({
      rootMargin: '0px 0px 120px 0px',
    });

    const sentinel = fixture.debugElement.query(By.directive(InfiniteScrollDirective));
    expect(MockIntersectionObserver.instances[0]?.observe).toHaveBeenCalledWith(
      sentinel.nativeElement,
    );
  });

  it('should emit when the sentinel becomes visible', () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    MockIntersectionObserver.instances[0]?.trigger({ isIntersecting: true });

    expect(fixture.componentInstance.scrolledCount).toBe(1);
  });

  it('should not emit when disabled is true', () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    MockIntersectionObserver.instances[0]?.trigger({ isIntersecting: true });

    expect(fixture.componentInstance.scrolledCount).toBe(0);
  });

  it('should disconnect the observer on destroy', () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const observer = MockIntersectionObserver.instances[0];
    fixture.destroy();

    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should not create an observer on the server platform', () => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    expect(MockIntersectionObserver.instances).toHaveLength(0);

    fixture.destroy();
  });
});

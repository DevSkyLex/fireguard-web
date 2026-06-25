import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SHOWCASE_SLOT, type ShowcaseContribution } from '@layouts/split-layout/slots/showcase';
import { SplitLayoutShowcaseOutlet } from '../split-layout-showcase-outlet.component';

@Component({ selector: 'app-stub-showcase', template: '<p>stub showcase</p>' })
class StubShowcase {}

@Component({ selector: 'app-stub-showcase-alt', template: '<p>alt showcase</p>' })
class StubShowcaseAlt {}

describe('SplitLayoutShowcaseOutlet', () => {
  it('should render nothing when no contribution is registered', () => {
    TestBed.configureTestingModule({ imports: [SplitLayoutShowcaseOutlet] });
    const fixture = TestBed.createComponent(SplitLayoutShowcaseOutlet);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-stub-showcase'))).toBeNull();
  });

  it('should render the active contribution component', () => {
    TestBed.configureTestingModule({
      imports: [SplitLayoutShowcaseOutlet],
      providers: [
        {
          provide: SHOWCASE_SLOT,
          multi: true,
          useValue: {
            id: 'stub',
            priority: 0,
            component: StubShowcase,
            active: signal(true),
          } satisfies ShowcaseContribution,
        },
      ],
    });
    const fixture = TestBed.createComponent(SplitLayoutShowcaseOutlet);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-stub-showcase'))).not.toBeNull();
  });

  it('should render the highest-priority active contribution', () => {
    TestBed.configureTestingModule({
      imports: [SplitLayoutShowcaseOutlet],
      providers: [
        {
          provide: SHOWCASE_SLOT,
          multi: true,
          useValue: {
            id: 'default',
            priority: 0,
            component: StubShowcase,
            active: signal(true),
          } satisfies ShowcaseContribution,
        },
        {
          provide: SHOWCASE_SLOT,
          multi: true,
          useValue: {
            id: 'override',
            priority: 10,
            component: StubShowcaseAlt,
            active: signal(true),
          } satisfies ShowcaseContribution,
        },
      ],
    });
    const fixture = TestBed.createComponent(SplitLayoutShowcaseOutlet);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-stub-showcase'))).toBeNull();
    expect(fixture.debugElement.query(By.css('app-stub-showcase-alt'))).not.toBeNull();
  });
});

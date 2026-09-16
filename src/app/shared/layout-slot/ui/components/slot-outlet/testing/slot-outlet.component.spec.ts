import {
  ChangeDetectionStrategy,
  Component,
  inject,
  InjectionToken,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SlotContribution, SlotPresentation } from '../../../../models';
import { SLOT_PRESENTATION } from '../../../../slot-presentation.token';
import { SlotOutlet } from '../slot-outlet.component';

@Component({ selector: 'app-first-stub', template: '<span>first</span>' })
class FirstStub {}

@Component({ selector: 'app-second-stub', template: '<span>second</span>' })
class SecondStub {}

const PARENT_CONTEXT = new InjectionToken<string>('SlotOutlet parent context');

@Component({
  selector: 'app-context-stub',
  template: '<span>{{ presentation }}:{{ parentContext }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ContextStub {
  protected readonly presentation: SlotPresentation = inject(SLOT_PRESENTATION);
  protected readonly parentContext: string = inject(PARENT_CONTEXT);
}

@Component({
  selector: 'app-host',
  imports: [SlotOutlet],
  template:
    '<div id="host"><app-slot-outlet [contributions]="contributions" [presentation]="presentation" /></div>',
  providers: [{ provide: PARENT_CONTEXT, useValue: 'inherited' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  public contributions: readonly SlotContribution[] = [];
  public presentation: SlotPresentation = 'default';
}

describe('SlotOutlet', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
  });

  it('renders nothing when no contribution is registered', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#host').textContent.trim()).toBe('');
  });

  it.each(['default', 'menu'] as const)(
    'provides %s presentation without hiding parent context',
    (presentation) => {
      fixture.componentInstance.presentation = presentation;
      fixture.componentInstance.contributions = [
        { id: 'context', order: 1, component: ContextStub },
      ];
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('span')?.textContent).toBe(`${presentation}:inherited`);
    },
  );

  it('renders every contribution, ordered by order', () => {
    fixture.componentInstance.contributions = [
      { id: 'second', order: 20, component: SecondStub as Type<unknown> },
      { id: 'first', order: 10, component: FirstStub as Type<unknown> },
    ];
    fixture.detectChanges();

    const rendered: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('span') as NodeListOf<HTMLElement>,
    ).map((element: HTMLElement): string => element.textContent ?? '');

    expect(rendered).toEqual(['first', 'second']);
  });

  it('stays transparent to the host layout box', () => {
    fixture.componentInstance.contributions = [
      { id: 'first', order: 10, component: FirstStub as Type<unknown> },
    ];
    fixture.detectChanges();

    // `display: contents` is what keeps the outlet from becoming a flex or grid
    // item of its own between the layout and its contributions.
    expect(fixture.nativeElement.querySelector('app-slot-outlet').className).toContain('contents');
  });
});

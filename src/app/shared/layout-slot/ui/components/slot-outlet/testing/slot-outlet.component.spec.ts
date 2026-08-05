import { ChangeDetectionStrategy, Component, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SlotContribution } from '../../../../models';
import { SlotOutlet } from '../slot-outlet.component';

@Component({ selector: 'app-first-stub', template: '<span>first</span>' })
class FirstStub {}

@Component({ selector: 'app-second-stub', template: '<span>second</span>' })
class SecondStub {}

@Component({
  selector: 'app-host',
  imports: [SlotOutlet],
  template: '<div id="host"><app-slot-outlet [contributions]="contributions" /></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  public contributions: readonly SlotContribution[] = [];
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

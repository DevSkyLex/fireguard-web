import { TestBed } from '@angular/core/testing';
import { InterventionSubstepNav } from '../intervention-substep-nav.component';
import type { InterventionSubstep } from '../models';

type InterventionSubstepNavHarness = {
  readonly active: () => string;
  readonly activeIndex: () => number;
  select(index: number): void;
  onKeydown(event: KeyboardEvent): void;
};

const STEPS: readonly InterventionSubstep[] = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
];

function createComponent(active: string = 'a'): InterventionSubstepNavHarness {
  const fixture = TestBed.createComponent(InterventionSubstepNav);
  fixture.componentRef.setInput('steps', STEPS);
  fixture.componentRef.setInput('ariaLabel', 'Steps');
  fixture.componentRef.setInput('active', active);
  fixture.detectChanges();
  return fixture.componentInstance as unknown as InterventionSubstepNavHarness;
}

describe('InterventionSubstepNav', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InterventionSubstepNav] });
  });

  it('should resolve the active index from the active key', () => {
    expect(createComponent('b').activeIndex()).toBe(1);
  });

  it('should fall back to the first step when the active key is unknown', () => {
    expect(createComponent('missing').activeIndex()).toBe(0);
  });

  it('should activate a step by index via select', () => {
    const component = createComponent('a');
    component.select(2);
    expect(component.active()).toBe('c');
  });

  it('should move to the next/previous step with arrow keys, wrapping around', () => {
    const component = createComponent('a');

    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(component.active()).toBe('b');

    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.active()).toBe('a');

    // Wrap backwards from the first step to the last.
    component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.active()).toBe('c');
  });

  it('should jump to the first/last step with Home/End', () => {
    const component = createComponent('b');

    component.onKeydown(new KeyboardEvent('keydown', { key: 'End' }));
    expect(component.active()).toBe('c');

    component.onKeydown(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(component.active()).toBe('a');
  });

  it('should ignore unrelated keys', () => {
    const component = createComponent('b');
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.active()).toBe('b');
  });
});

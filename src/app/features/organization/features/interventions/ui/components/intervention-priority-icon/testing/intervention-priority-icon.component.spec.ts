import { TestBed } from '@angular/core/testing';
import { resolveInterventionTag } from '@features/organization/features/interventions/models';
import { InterventionPriorityIcon } from '../intervention-priority-icon.component';

describe('InterventionPriorityIcon', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InterventionPriorityIcon] });
  });

  function createComponent(priority: 'low' | 'normal' | 'high' | 'urgent'): HTMLElement {
    const fixture = TestBed.createComponent(InterventionPriorityIcon);
    fixture.componentRef.setInput('priority', priority);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    const element = createComponent('normal');

    expect(element).toBeTruthy();
  });

  it('should carry the intervention-tag priority label as the accessible name', () => {
    const element = createComponent('high');
    const svg = element.querySelector('svg') as SVGElement;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(resolveInterventionTag('priority', 'high').label);
  });

  it('should fill exactly one bar for low priority', () => {
    const element = createComponent('low');
    const filled = element.querySelectorAll('rect.fill-current');

    expect(filled.length).toBe(1);
  });

  it('should fill exactly two bars for normal priority', () => {
    const element = createComponent('normal');
    const filled = element.querySelectorAll('rect.fill-current');

    expect(filled.length).toBe(2);
  });

  it('should fill three of the four bars for high priority', () => {
    const element = createComponent('high');

    expect(element.querySelectorAll('rect.fill-current').length).toBe(3);
  });

  it('should fill all four bars for urgent priority', () => {
    const element = createComponent('urgent');

    // Urgent fills the extra tallest fourth bar rather than switching glyphs.
    expect(element.querySelectorAll('rect.fill-current').length).toBe(4);
    expect((element.querySelector('svg') as SVGElement).getAttribute('aria-label')).toBe(
      resolveInterventionTag('priority', 'urgent').label,
    );
  });
});

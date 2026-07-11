import { TestBed } from '@angular/core/testing';
import type { InterventionLabelSummary } from '@features/organization/features/interventions/models';
import { InterventionLabelChip } from '../intervention-label-chip.component';

describe('InterventionLabelChip', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InterventionLabelChip] });
  });

  function createComponent(label: InterventionLabelSummary): HTMLElement {
    const fixture = TestBed.createComponent(InterventionLabelChip);
    fixture.componentRef.setInput('label', label);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    const element = createComponent({ id: 'label-1', name: 'Urgent', color: '#ff0000' });

    expect(element).toBeTruthy();
  });

  it('should render the label name', () => {
    const element = createComponent({ id: 'label-1', name: 'Urgent', color: '#ff0000' });

    expect(element.textContent).toContain('Urgent');
  });

  it('should render the label colour as the dot background', () => {
    const element = createComponent({ id: 'label-1', name: 'Urgent', color: '#ff0000' });
    const dot = element.querySelector('span[aria-hidden="true"]') as HTMLElement;

    expect(dot.style.background).toBe('rgb(255, 0, 0)');
  });
});

import { TestBed } from '@angular/core/testing';
import type { MessageReferenceOutput } from '@features/organization/features/collaboration/models';
import { MessageReferenceCard } from '../message-reference-card.component';

describe('MessageReferenceCard', () => {
  function render(reference: MessageReferenceOutput): HTMLElement {
    TestBed.configureTestingModule({ imports: [MessageReferenceCard] });

    const fixture = TestBed.createComponent(MessageReferenceCard);
    fixture.componentRef.setInput('reference', reference);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('should render the label and the code', () => {
    const element = render({
      type: 'non_conformity',
      id: 'nc-1',
      label: 'Extincteur manquant',
      code: 'NC-204',
    });

    expect(element.textContent).toContain('Extincteur manquant');
    expect(element.textContent).toContain('NC-204');
  });

  it('should always spell out the record type so severity is never colour-only', () => {
    const element = render({
      type: 'non_conformity',
      id: 'nc-1',
      label: 'Extincteur manquant',
      code: null,
    });

    expect(element.textContent).toContain('Non-conformity');
  });

  it('should fall back to the code when the label is missing', () => {
    // `label` and `code` are the only genuinely nullable fields of the contract.
    const element = render({ type: 'intervention', id: 'iv-1', label: null, code: 'IV-77' });

    expect(element.textContent).toContain('IV-77');
  });

  it('should fall back to the type name when both label and code are missing', () => {
    const element = render({ type: 'facility', id: 'fa-1', label: null, code: null });

    // Singular: a card points at one record, so it no longer borrows the
    // plural navigation label.
    expect(element.textContent).toContain('Facility');
    expect(element.textContent).not.toContain('Facilities');
  });

  it('should omit the code chip when there is no code', () => {
    const element = render({ type: 'equipment', id: 'eq-1', label: 'RIA 3', code: null });

    expect(element.querySelectorAll('span.font-mono')).toHaveLength(0);
  });
});

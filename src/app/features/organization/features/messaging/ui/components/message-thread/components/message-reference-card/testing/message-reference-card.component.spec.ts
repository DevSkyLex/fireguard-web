import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { MessageReference } from '@features/organization/features/messaging/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { MessageReferenceCard } from '../message-reference-card.component';

describe('MessageReferenceCard', () => {
  let fixture: ComponentFixture<MessageReferenceCard>;

  const render = (reference: MessageReference): void => {
    fixture = TestBed.createComponent(MessageReferenceCard);
    fixture.componentRef.setInput('reference', reference);
    fixture.detectChanges();
  };

  const at = (testId: string): HTMLElement | null =>
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement as
      | HTMLElement
      | undefined) ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageReferenceCard],
      providers: [
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
      ],
    });
  });

  it('links a facility reference to its detail page', () => {
    render({ type: 'facility', id: 'f-1', label: 'Tour Nord', code: 'FG-FAC-004' });

    const card: HTMLElement | null = at('message-reference');
    expect(card?.tagName).toBe('A');
    expect(card?.getAttribute('href')).toBe('/organizations/org-1/facilities/f-1');
    expect(at('message-reference-title')?.textContent?.trim()).toBe('Tour Nord');
    expect(at('message-reference-code')?.textContent?.trim()).toBe('FG-FAC-004');
  });

  it.each([
    ['equipment', 'equipments'],
    ['intervention', 'interventions'],
  ] as const)('links a %s reference to its detail page', (type, segment) => {
    render({ type, id: 'r-9' });

    expect(at('message-reference')?.getAttribute('href')).toBe(
      `/organizations/org-1/${segment}/r-9`,
    );
  });

  // A non-conformity has no page of its own, and the reference does not carry
  // the inspection that would stand in for one. A dead <a> would advertise a
  // navigation the app cannot perform.
  it('renders a non-conformity as plain content, not a link', () => {
    render({ type: 'non_conformity', id: 'nc-1', code: 'FG-NC-231' });

    const card: HTMLElement | null = at('message-reference');
    expect(card?.tagName).toBe('DIV');
    expect(card?.getAttribute('href')).toBeNull();
  });

  // Status is never colour-only (PRODUCT.md): the danger tint is always paired
  // with the warning icon and the spelled-out kind.
  it('renders the non-conformity variant as danger, with a label and an icon', () => {
    render({ type: 'non_conformity', id: 'nc-1', label: 'Extincteur périmé' });

    const card: HTMLElement | null = at('message-reference');
    expect(card?.className).toContain('border-red-300');
    expect(card?.className).toContain('dark:border-red-900');
    expect(at('message-reference-kind')?.textContent?.trim()).toBe('Non-conformity');
    expect(fixture.debugElement.query(By.css('.pi-exclamation-triangle'))).not.toBeNull();
  });

  it('keeps the other kinds off the danger surface', () => {
    render({ type: 'equipment', id: 'e-1' });

    expect(at('message-reference')?.className).not.toContain('border-red-300');
    expect(at('message-reference-kind')?.textContent?.trim()).toBe('Equipment');
  });

  // API Platform omits null fields, so "nullable" label/code arrive as
  // undefined — a `=== null` guard would let them through and print nothing.
  it('falls back to the kind and drops the badge when label and code are omitted', () => {
    render({ type: 'intervention', id: 'i-1' });

    expect(at('message-reference-title')?.textContent?.trim()).toBe('Intervention');
    expect(at('message-reference-code')).toBeNull();
  });

  it('treats a blank label and code as absent', () => {
    render({ type: 'facility', id: 'f-2', label: '   ', code: '' });

    expect(at('message-reference-title')?.textContent?.trim()).toBe('Facility');
    expect(at('message-reference-code')).toBeNull();
  });

  // Without an organization there is no scoped route to build, so the card
  // degrades to plain content rather than navigating somewhere wrong.
  it('renders plain content while no organization is selected', () => {
    TestBed.overrideProvider(ORGANIZATION_CONTEXT_PORT, {
      useValue: { selectedOrganization: signal(null) },
    });

    render({ type: 'facility', id: 'f-1' });

    expect(at('message-reference')?.tagName).toBe('DIV');
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionCommentForm } from '../intervention-comment-form.component';

describe('InterventionCommentForm', () => {
  let fixture: ComponentFixture<InterventionCommentForm>;
  let submissions: string[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const body = (): HTMLTextAreaElement =>
    root().querySelector('[data-testid="intervention-comment-body"]') as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-comment-submit"]') as HTMLButtonElement;

  const type = async (value: string): Promise<void> => {
    body().value = value;
    body().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionCommentForm);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should refuse an empty comment', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Write a comment first.');
  });

  it('should emit the comment, trimmed, then clear the draft', async () => {
    await type('  Checked the panel.  ');
    await submit();

    expect(submissions).toEqual(['Checked the panel.']);
    expect(body().value).toBe('');
  });

  it('should not submit while a post is already in flight', async () => {
    await type('Checked the panel.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should not submit when commenting is disabled', async () => {
    await type('Checked the panel.');
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
  });

  it('should surface what the API said about a rejected post', async () => {
    fixture.componentRef.setInput('serverError', {
      '@type': 'ConstraintViolation',
      status: 422,
      violations: [{ propertyPath: 'body', message: 'The comment is too long.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-comment-error"]')?.textContent,
    ).toContain('The comment is too long.');
  });

  it('should fall back to a readable message when the API said nothing showable', async () => {
    fixture.componentRef.setInput('serverError', new Error('Http failure response'));
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-comment-error"]')?.textContent,
    ).toContain('The comment could not be posted.');
  });

  it('should announce nothing before a failure', () => {
    expect(root().querySelector('[data-testid="intervention-comment-error"]')).toBeNull();
  });
});

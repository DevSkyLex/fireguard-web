import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MemberSelectOption } from '@features/organization/features/interventions/models';
import { InterventionCommentForm } from '../intervention-comment-form.component';

const MEMBER: MemberSelectOption = {
  value: '/api/organizations/org-1/members/3fa85f64-5717-4562-b3fc-2c963f66afa6',
  label: 'Marc Dubois',
  displayName: 'Marc Dubois',
  roleLabel: 'Technician',
  avatarUrl: null,
  initials: 'MD',
};

const SECOND_MEMBER: MemberSelectOption = {
  value: '/api/organizations/org-1/members/8f0b9fc5-49ad-4e6c-a2ba-7872e8217090',
  label: 'Sofia Lambert',
  displayName: 'Sofia Lambert',
  roleLabel: 'Safety lead',
  avatarUrl: null,
  initials: 'SL',
};

describe('InterventionCommentForm', () => {
  let fixture: ComponentFixture<InterventionCommentForm>;
  let submissions: string[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const body = (): HTMLTextAreaElement =>
    root().querySelector('[data-testid="intervention-comment-body"]') as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-comment-submit"]') as HTMLButtonElement;
  const mentionTrigger = (): HTMLButtonElement =>
    root().querySelector(
      '[data-testid="intervention-comment-mention-trigger"]',
    ) as HTMLButtonElement;
  const mentionOptions = (): NodeListOf<HTMLButtonElement> =>
    root().querySelectorAll('[data-testid="intervention-comment-mention-option"]');

  const type = async (value: string): Promise<void> => {
    body().value = value;
    body().selectionStart = value.length;
    body().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const selectTwoMentions = async (): Promise<void> => {
    fixture.componentRef.setInput('members', [MEMBER, SECOND_MEMBER]);
    await fixture.whenStable();
    await type('@M');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('@Marc Dubois and @Sof');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionCommentForm);
    fixture.componentRef.setInput('members', [MEMBER]);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should refuse an empty comment', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Write a comment first.');
  });

  it('should read as busy with a progressive label while a post is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Posting…');
  });

  it('should tell the agent an offline comment is queued, not lost, and relabel the action', async () => {
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();

    expect(submitButton().textContent).toContain('Queue comment');
    expect(
      root().querySelector('[data-testid="intervention-comment-offline-hint"]')?.textContent,
    ).toContain('queued and sent when you reconnect');
  });

  it('should still submit while offline — the queue is the post path, not a dead end', async () => {
    fixture.componentRef.setInput('online', false);
    await fixture.whenStable();
    await type('Riser valve replaced.');
    await submit();

    expect(submissions).toEqual(['Riser valve replaced.']);
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

  it('should offer members from the picker once "@" is typed', async () => {
    await type('ping @');

    expect(mentionOptions()).toHaveLength(1);
    expect(mentionOptions()[0].textContent).toContain('Marc Dubois');
  });

  it.each([
    ['ArrowDown', 'Tab'],
    ['ArrowUp', 'Enter'],
  ] as const)(
    'chooses the highlighted mention with %s then %s while keeping focus in the draft',
    async (direction, accept) => {
      fixture.componentRef.setInput('members', [MEMBER, SECOND_MEMBER]);
      await fixture.whenStable();
      await type('Notify @');

      const move = new KeyboardEvent('keydown', {
        key: direction,
        bubbles: true,
        cancelable: true,
      });
      body().dispatchEvent(move);
      await fixture.whenStable();
      expect(move.defaultPrevented).toBe(true);
      expect(mentionOptions()[1].getAttribute('aria-selected')).toBe('true');
      expect(body().getAttribute('aria-activedescendant')).toBe(mentionOptions()[1].id);

      const choose = new KeyboardEvent('keydown', {
        key: accept,
        bubbles: true,
        cancelable: true,
      });
      body().dispatchEvent(choose);
      await fixture.whenStable();
      expect(choose.defaultPrevented).toBe(true);
      expect(body().value).toBe('Notify @Sofia Lambert ');
      expect(document.activeElement).toBe(body());
      expect(submissions).toEqual([]);
    },
  );

  it('dismisses a mention query with Escape and reopens suggestions after the query changes', async () => {
    await type('Notify @Ma');
    expect(mentionOptions()).toHaveLength(1);

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    body().dispatchEvent(escape);
    await fixture.whenStable();
    expect(escape.defaultPrevented).toBe(true);
    expect(mentionOptions()).toHaveLength(0);
    expect(body().value).toBe('Notify @Ma');

    await type('Notify @Mar');
    expect(mentionOptions()).toHaveLength(1);
  });

  it('should insert the readable member name at the caret when a suggestion is picked', async () => {
    await type('ping @');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();

    expect(body().value).toBe('ping @Marc Dubois ');
    expect(mentionOptions()).toHaveLength(0);
    expect(root().querySelector('[data-testid="intervention-comment-mention-chips"]')).toBeNull();
  });

  it('should open the picker from the at-sign trigger button', async () => {
    await fixture.whenStable();
    mentionTrigger().dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(body().value).toBe('@');
    expect(mentionOptions()).toHaveLength(1);
  });

  it('should serialize a selected readable mention to the API token on submit', async () => {
    await type('ping @');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('ping @Marc Dubois please');
    await submit();

    expect(submissions).toEqual(['ping @{3fa85f64-5717-4562-b3fc-2c963f66afa6} please']);
  });

  it('should serialize only the picked occurrence when the same name is typed manually later', async () => {
    await type('@');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('@Marc Dubois and @Marc Dubois');
    await submit();

    expect(submissions).toEqual(['@{3fa85f64-5717-4562-b3fc-2c963f66afa6} and @Marc Dubois']);
  });

  it('should keep a selected mention when text is inserted before it', async () => {
    await type('@');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('Please notify @Marc Dubois ');
    await submit();

    expect(submissions).toEqual(['Please notify @{3fa85f64-5717-4562-b3fc-2c963f66afa6}']);
  });

  it('should forget notification intent when the picked occurrence is edited', async () => {
    await type('@');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('@Marc Duboi');
    await type('Plain @Marc Dubois');
    await submit();

    expect(submissions).toEqual(['Plain @Marc Dubois']);
  });

  it('should leave a manually typed display name as ordinary text', async () => {
    await type('ping @Marc Dubois please');
    await submit();

    expect(submissions).toEqual(['ping @Marc Dubois please']);
  });

  it('should not serialize a selected name when it is only the prefix of ordinary text', async () => {
    await type('ping @');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('ping @Marc Duboisette');
    await submit();

    expect(submissions).toEqual(['ping @Marc Duboisette']);
  });

  it('should serialize a selected mention before closing punctuation', async () => {
    await type('(@');
    mentionOptions()[0].dispatchEvent(new MouseEvent('mousedown'));
    await fixture.whenStable();
    await type('(@Marc Dubois)');
    await submit();

    expect(submissions).toEqual(['(@{3fa85f64-5717-4562-b3fc-2c963f66afa6})']);
  });

  it('keeps both selected recipients when text is inserted before their mentions', async () => {
    await selectTwoMentions();
    await type('Please notify @Marc Dubois and @Sofia Lambert ');
    await submit();

    expect(submissions).toEqual([
      'Please notify @{3fa85f64-5717-4562-b3fc-2c963f66afa6} and @{8f0b9fc5-49ad-4e6c-a2ba-7872e8217090}',
    ]);
  });

  it('drops only the edited recipient and keeps the other notification intent', async () => {
    await selectTwoMentions();
    await type('@Marc Duboi and @Sofia Lambert ');
    await submit();

    expect(submissions).toEqual(['@Marc Duboi and @{8f0b9fc5-49ad-4e6c-a2ba-7872e8217090}']);
  });
});

import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError, type StoreError } from '@core/request-state';
import type { AssistantMessageOutput } from '@features/organization/features/collaboration/models';
import { AssistantStore } from '@features/organization/features/collaboration/state';
import { AssistantPanel } from '../assistant-panel.component';
import { ASSISTANT_MAX_QUESTION_LENGTH } from '../constants';

/** A turn, with only the fields the panel reads spelled out. */
function message(
  id: string,
  role: string,
  overrides: Partial<AssistantMessageOutput> = {},
): AssistantMessageOutput {
  return {
    id,
    threadId: 'thread-1',
    organizationId: 'org-1',
    role,
    body: role === 'user' ? 'question' : '',
    status: role === 'user' ? 'complete' : 'pending',
    createdAt: '2026-07-22T10:00:00+00:00',
    ...overrides,
  } as AssistantMessageOutput;
}

describe('AssistantPanel', () => {
  let fixture: ComponentFixture<AssistantPanel>;
  let messages: WritableSignal<readonly AssistantMessageOutput[]>;
  let isLoading: WritableSignal<boolean>;
  let isGenerating: WritableSignal<boolean>;
  let isAsking: WritableSignal<boolean>;
  let isControlling: WritableSignal<boolean>;
  let generationStalled: WritableSignal<boolean>;
  let loadError: WritableSignal<StoreError | null>;
  let askError: WritableSignal<StoreError | null>;
  let controlError: WritableSignal<StoreError | null>;
  let controlAttempt: ReturnType<typeof vi.fn>;
  let loadThread: ReturnType<typeof vi.fn>;
  let asked: string[];

  /** The first element matching a test hook, or `null`. */
  function hook(name: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${name}"]`);
  }

  /** How many elements carry a test hook. */
  function count(name: string): number {
    return (fixture.nativeElement as HTMLElement).querySelectorAll(`[data-testid="${name}"]`)
      .length;
  }

  beforeEach(async () => {
    messages = signal<readonly AssistantMessageOutput[]>([]);
    isLoading = signal<boolean>(false);
    isGenerating = signal<boolean>(false);
    isAsking = signal<boolean>(false);
    isControlling = signal<boolean>(false);
    generationStalled = signal<boolean>(false);
    loadError = signal<StoreError | null>(null);
    askError = signal<StoreError | null>(null);
    controlError = signal<StoreError | null>(null);
    controlAttempt = vi.fn();
    loadThread = vi.fn();
    asked = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AssistantStore,
          useValue: {
            messages,
            isLoading,
            isGenerating,
            isControlling,
            controlError,
            controlAttempt,
            loadThread,
            threadId: signal('thread-1'),
            isAsking,
            isAvailable: signal<boolean>(true),
            loadError,
            askError,
            generationStalled,
            panelOpen: signal<boolean>(true),
            ask: (question: string): void => {
              asked.push(question);
            },
            startNewThread: (): void => {},
            dismissStalled: (): void => {},
            closePanel: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(AssistantPanel);
    await fixture.whenStable();
  });

  it('should offer the opening prompts only while the thread is empty', async () => {
    expect(hook('assistant-intro')).not.toBeNull();
    expect(count('assistant-suggestion')).toBeGreaterThan(0);

    messages.set([message('m-1', 'user')]);
    await fixture.whenStable();

    expect(hook('assistant-intro')).toBeNull();
    expect(count('assistant-suggestion')).toBe(0);
  });

  it('should show a pending reply as thinking rather than as a blank bubble', async () => {
    messages.set([message('m-1', 'user'), message('m-2', 'assistant')]);
    await fixture.whenStable();

    expect(hook('assistant-thinking')).not.toBeNull();
    expect(hook('assistant-message')).toBeNull();
  });

  it('should name the failure code of a reply that could not be produced', async () => {
    messages.set([
      message('m-2', 'assistant', { status: 'failed', errorCode: 'model_unavailable' }),
    ]);
    await fixture.whenStable();

    expect(hook('assistant-message-failed')?.textContent).toContain('model_unavailable');
  });

  it('should announce the state without making the transcript a live region', async () => {
    isGenerating.set(true);
    await fixture.whenStable();

    const transcript: HTMLElement | null = hook('assistant-transcript');

    expect(transcript?.getAttribute('aria-live')).toBeNull();
    expect(transcript?.getAttribute('aria-busy')).toBe('true');
    expect(hook('assistant-status')?.getAttribute('role')).toBe('status');
    expect(hook('assistant-status')?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('should send an opening prompt straight through', async () => {
    (hook('assistant-suggestion') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(asked).toHaveLength(1);
  });

  it('should refuse to send an empty question', async () => {
    const send: HTMLButtonElement | null = hook('assistant-send') as HTMLButtonElement | null;

    expect(send?.disabled).toBe(true);
  });

  it('prioritizes load, ask, loading, stalled and generation announcements', async () => {
    loadError.set(toStoreError(new Error('load failed')));
    askError.set(toStoreError(new Error('ask failed')));
    isLoading.set(true);
    generationStalled.set(true);
    isGenerating.set(true);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('could not be loaded');
    expect(hook('assistant-load-error')).toBeNull();

    loadError.set(null);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('could not be sent');
    expect(hook('assistant-ask-error')?.textContent).toContain('ask failed');

    askError.set(null);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('Loading');
    expect(hook('assistant-intro')).toBeNull();

    isLoading.set(false);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('stopped answering');
    expect(hook('assistant-stalled')).not.toBeNull();

    generationStalled.set(false);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('answering');

    isGenerating.set(false);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent?.trim()).toBe('');
    expect(hook('assistant-intro')).not.toBeNull();
  });

  it('announces only replies to a question asked in this panel', async () => {
    messages.set([
      message('reply-1', 'assistant', { body: 'Restored answer', status: 'complete' }),
    ]);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent?.trim()).toBe('');
    expect(hook('assistant-message')?.textContent).toBe('Restored answer');

    fixture.componentInstance['askSuggestion']('Current status');
    messages.set([message('question-1', 'user')]);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent?.trim()).toBe('');

    messages.set([message('reply-2', 'assistant', { body: 'Done', status: 'complete' })]);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('Answer ready');

    messages.set([message('reply-2', 'assistant', { status: 'cancelled', body: 'Partial reply' })]);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('Generation stopped');
    expect(hook('assistant-transcript')?.textContent).toContain('Partial reply');

    messages.set([message('reply-2', 'assistant', { status: 'failed' })]);
    await fixture.whenStable();
    expect(hook('assistant-status')?.textContent).toContain('could not answer');
  });

  it('sends a trimmed question on Enter while Shift+Enter keeps the draft', async () => {
    const field = hook('assistant-input') as HTMLTextAreaElement;
    field.value = '  What is due today?  ';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect((hook('assistant-send') as HTMLButtonElement).disabled).toBe(false);

    const newline = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(newline);
    expect(newline.defaultPrevented).toBe(false);
    expect(asked).toEqual([]);

    const submit = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(submit);
    await fixture.whenStable();
    expect(submit.defaultPrevented).toBe(true);
    expect(asked).toEqual(['What is due today?']);
    expect(field.value).toBe('');
  });

  it('blocks questions while controls, asking or generation are active and rejects oversized drafts', async () => {
    fixture.componentInstance['model'].set({ question: 'Safety summary' });
    await fixture.whenStable();

    isControlling.set(true);
    await fixture.whenStable();
    expect((hook('assistant-send') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance['askSuggestion']('Suggested question');
    isControlling.set(false);

    isAsking.set(true);
    await fixture.whenStable();
    expect((hook('assistant-send') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance['askSuggestion']('Suggested question');
    isAsking.set(false);

    isGenerating.set(true);
    await fixture.whenStable();
    expect((hook('assistant-send') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance['askSuggestion']('Suggested question');
    isGenerating.set(false);
    expect(asked).toEqual([]);

    fixture.componentInstance['model'].set({
      question: 'x'.repeat(ASSISTANT_MAX_QUESTION_LENGTH + 1),
    });
    await fixture.whenStable();
    expect((hook('assistant-send') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance['send']();
    expect(asked).toEqual([]);
  });

  it('routes stop, retry and stalled-progress controls while showing control failures', async () => {
    messages.set([
      message('reply-1', 'assistant', { status: 'pending', canCancel: true }),
      message('reply-2', 'assistant', { status: 'failed', canRetry: true }),
    ]);
    generationStalled.set(true);
    await fixture.whenStable();

    (hook('assistant-cancel') as HTMLButtonElement).click();
    (hook('assistant-retry') as HTMLButtonElement).click();
    (hook('assistant-stalled-dismiss') as HTMLButtonElement).click();
    expect(controlAttempt).toHaveBeenNthCalledWith(1, { messageId: 'reply-1', retry: false });
    expect(controlAttempt).toHaveBeenNthCalledWith(2, { messageId: 'reply-2', retry: true });
    expect(loadThread).toHaveBeenCalledExactlyOnceWith('thread-1');

    controlError.set(toStoreError(new Error('Control unavailable')));
    isControlling.set(true);
    await fixture.whenStable();
    expect(hook('assistant-transcript')?.textContent).toContain('The assistant has been quiet');
    expect((hook('assistant-cancel') as HTMLButtonElement).disabled).toBe(true);
    expect((hook('assistant-retry') as HTMLButtonElement).disabled).toBe(true);
    expect((hook('assistant-stalled-dismiss') as HTMLButtonElement).disabled).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('p[role="alert"]')?.textContent,
    ).toContain('Control unavailable');

    isControlling.set(false);
    isGenerating.set(true);
    await fixture.whenStable();
    expect((hook('assistant-retry') as HTMLButtonElement).disabled).toBe(true);
  });
});

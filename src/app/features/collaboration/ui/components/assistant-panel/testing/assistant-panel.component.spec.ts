import { signal, type Signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { AssistantMessageOutput } from '@features/collaboration/models';
import { AssistantStore } from '@features/collaboration/state';
import { WorkspaceShellService } from '@layouts/workspace-layout';
import { AssistantPanel } from '../assistant-panel.component';

/** A turn, with only the fields the template reads. */
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
    body: '',
    status: 'complete',
    createdAt: '2026-07-22T10:00:00+00:00',
    ...overrides,
  };
}

describe('AssistantPanel', () => {
  let messages: WritableSignal<readonly AssistantMessageOutput[]>;
  let stalled: WritableSignal<boolean>;
  let asked: string[];
  let closed: boolean[];
  let restored: boolean;

  function createFixture() {
    const zero: Signal<boolean> = signal(false).asReadonly();
    const store = {
      messages: messages.asReadonly(),
      generationStalled: stalled.asReadonly(),
      isLoading: zero,
      isAsking: zero,
      isGenerating: zero,
      loadError: signal(null).asReadonly(),
      askError: signal(null).asReadonly(),
      ask: (body: string): void => void asked.push(body),
      closePanel: (): boolean => {
        closed.push(true);

        return restored;
      },
      startNewThread: (): void => undefined,
      dismissStalled: (): void => stalled.set(false),
    };

    TestBed.configureTestingModule({
      imports: [AssistantPanel],
      providers: [
        { provide: AssistantStore, useValue: store },
        {
          provide: WorkspaceShellService,
          useValue: { setPanelVisible: (visible: boolean): void => void closed.push(visible) },
        },
      ],
    });

    const fixture = TestBed.createComponent(AssistantPanel);
    fixture.detectChanges();

    return fixture;
  }

  function testId(fixture: ReturnType<typeof createFixture>, id: string): HTMLElement | null {
    return fixture.debugElement.query(By.css(`[data-testid="${id}"]`))?.nativeElement ?? null;
  }

  beforeEach(() => {
    messages = signal<readonly AssistantMessageOutput[]>([]);
    stalled = signal<boolean>(false);
    asked = [];
    closed = [];
    restored = true;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should offer the intro and suggestions while the thread is empty', () => {
    const fixture = createFixture();

    expect(testId(fixture, 'assistant-intro')).not.toBeNull();
    expect(
      fixture.debugElement.queryAll(By.css('[data-testid="assistant-suggestion"]')).length,
    ).toBe(4);
  });

  it('should send a suggestion straight through', () => {
    const fixture = createFixture();

    fixture.debugElement
      .query(By.css('[data-testid="assistant-suggestion"]'))
      .nativeElement.click();

    expect(asked.length).toBe(1);
  });

  it('should drop the intro and the suggestions once the thread has turns', () => {
    messages.set([message('m-1', 'user', { body: 'Bonjour' })]);

    const fixture = createFixture();

    expect(testId(fixture, 'assistant-intro')).toBeNull();
    expect(testId(fixture, 'assistant-suggestion')).toBeNull();
  });

  it('should show a spinner for a reply whose body has not arrived', () => {
    messages.set([message('m-1', 'assistant', { body: '', status: 'streaming' })]);

    const fixture = createFixture();

    expect(testId(fixture, 'assistant-thinking')).not.toBeNull();
    expect(testId(fixture, 'assistant-message')).toBeNull();
  });

  it('should render a failed reply with its error code rather than an empty bubble', () => {
    messages.set([
      message('m-1', 'assistant', { body: '', status: 'failed', errorCode: 'model_unavailable' }),
    ]);

    const fixture = createFixture();

    expect(testId(fixture, 'assistant-message-failed')?.textContent).toContain('model_unavailable');
    expect(testId(fixture, 'assistant-thinking')).toBeNull();
  });

  it('should not send a blank question', () => {
    const fixture = createFixture();
    const textarea = fixture.debugElement.query(By.css('textarea'))
      .nativeElement as HTMLTextAreaElement;

    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(asked).toEqual([]);
  });

  it('should send on Enter and clear the composer', () => {
    const fixture = createFixture();
    const textarea = fixture.debugElement.query(By.css('textarea'))
      .nativeElement as HTMLTextAreaElement;

    textarea.value = '  Where are we on inspections?  ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(asked).toEqual(['Where are we on inspections?']);
    expect(textarea.value).toBe('');
  });

  it('should restore the previous panel visibility on close', () => {
    restored = false;

    const fixture = createFixture();
    testId(fixture, 'assistant-panel-close')?.click();

    // `closePanel()` reported `false`, so that is what the shell is told.
    expect(closed).toEqual([true, false]);
  });

  it('should surface a stalled generation with a way out', () => {
    stalled.set(true);

    const fixture = createFixture();

    expect(testId(fixture, 'assistant-stalled')).not.toBeNull();

    testId(fixture, 'assistant-stalled-dismiss')?.click();
    fixture.detectChanges();

    expect(testId(fixture, 'assistant-stalled')).toBeNull();
  });
});

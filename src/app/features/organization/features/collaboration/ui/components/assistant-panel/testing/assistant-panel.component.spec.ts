import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AssistantMessageOutput } from '@features/organization/features/collaboration/models';
import { AssistantStore } from '@features/organization/features/collaboration/state';
import { AssistantPanel } from '../assistant-panel.component';

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
            isAsking: signal<boolean>(false),
            isAvailable: signal<boolean>(true),
            loadError: signal(null),
            askError: signal(null),
            generationStalled: signal<boolean>(false),
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

    expect(asked.length).toBe(1);
  });

  it('should refuse to send an empty question', async () => {
    const send: HTMLButtonElement | null = hook('assistant-send') as HTMLButtonElement | null;

    expect(send?.disabled).toBe(true);
  });
});

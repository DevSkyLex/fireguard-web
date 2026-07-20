import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { AssistantMessage } from '@features/organization/features/assistant/models';
import { AssistantThreadStore } from '@features/organization/features/assistant/state';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { AssistantPanel } from '../assistant-panel.component';

const ORG = { id: 'org-1', name: 'Acme' };

/**
 * The panel is the assistant's only surface since the route was deleted, so
 * these specs pin the behaviour the routed page never had: asking with no
 * thread open must start one and forward the question rather than dead-end.
 */
describe('AssistantPanel', () => {
  let activeThreadId: WritableSignal<string | null>;
  let startedThreadId: WritableSignal<string | null>;
  let messages: WritableSignal<readonly AssistantMessage[]>;
  let threads: WritableSignal<readonly { readonly id: string }[]>;
  let store: Record<string, unknown>;

  const build = (): ComponentFixture<AssistantPanel> => {
    TestBed.configureTestingModule({
      imports: [AssistantPanel],
      providers: [
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal(ORG) },
        },
      ],
    });

    // The component provides the real store itself — a component-level provider
    // wins over the module's, so the double has to be installed at the same
    // level or it is silently ignored.
    TestBed.overrideComponent(AssistantPanel, {
      set: { providers: [{ provide: AssistantThreadStore, useValue: store }] },
    });

    const fixture = TestBed.createComponent(AssistantPanel);
    fixture.detectChanges();

    return fixture;
  };

  const type = (fixture: ComponentFixture<AssistantPanel>, text: string): void => {
    const field = fixture.debugElement.query(By.css('[data-testid="assistant-composer"]'));
    field.triggerEventHandler('ngModelChange', text);
    fixture.detectChanges();
  };

  const send = (fixture: ComponentFixture<AssistantPanel>): void => {
    fixture.debugElement
      .query(By.css('[data-testid="assistant-send"]'))
      .query(By.css('button'))
      .nativeElement.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    activeThreadId = signal<string | null>(null);
    startedThreadId = signal<string | null>(null);
    messages = signal<readonly AssistantMessage[]>([]);
    threads = signal<readonly { readonly id: string }[]>([]);

    store = {
      activeThreadId,
      startedThreadId,
      messages,
      threads,
      isAnswering: signal(false),
      isStartingThread: signal(false),
      isLoadingMessages: signal(false),
      hasOlderMessages: signal(false),
      setOrganization: vi.fn(),
      loadThreads: vi.fn(),
      startThread: vi.fn(),
      clearStartedThread: vi.fn(),
      openThread: vi.fn(),
      ask: vi.fn(),
      loadOlderMessages: vi.fn(),
    };
  });

  it('binds itself to the active organization', () => {
    build();

    expect(store['setOrganization']).toHaveBeenCalledWith('org-1');
    expect(store['loadThreads']).toHaveBeenCalledWith('org-1');
  });

  it('keeps the composer live with no thread, instead of a dead-end empty state', () => {
    const fixture = build();

    expect(fixture.debugElement.query(By.css('[data-testid="assistant-composer"]'))).not.toBeNull();
    expect(
      fixture.debugElement.query(By.css('[data-testid="assistant-panel-empty"]')),
    ).not.toBeNull();
  });

  it('starts a thread instead of asking when none is open', () => {
    const fixture = build();
    type(fixture, 'How many extinguishers are overdue?');
    send(fixture);

    expect(store['startThread']).toHaveBeenCalledWith(null);
    // The question must not be sent yet: there is no thread to send it to.
    expect(store['ask']).not.toHaveBeenCalled();
  });

  it('forwards the held question once the new thread opens', () => {
    const fixture = build();
    type(fixture, 'How many extinguishers are overdue?');
    send(fixture);

    startedThreadId.set('thread-1');
    fixture.detectChanges();

    expect(store['openThread']).toHaveBeenCalledWith('thread-1');
    expect(store['clearStartedThread']).toHaveBeenCalled();
    expect(store['ask']).toHaveBeenCalledWith('How many extinguishers are overdue?');
  });

  it('asks directly when a thread is already open', () => {
    activeThreadId.set('thread-9');
    const fixture = build();
    type(fixture, 'And the alarms?');
    send(fixture);

    expect(store['ask']).toHaveBeenCalledWith('And the alarms?');
    expect(store['startThread']).not.toHaveBeenCalled();
  });

  it('sends a suggested opener rather than only filling the field', () => {
    const fixture = build();

    const suggestion = fixture.debugElement.query(By.css('[data-testid="assistant-suggestion"]'));
    const text = (suggestion.nativeElement as HTMLElement).textContent?.trim() ?? '';
    suggestion.nativeElement.click();
    fixture.detectChanges();

    // No thread yet, so it starts one and holds the question.
    expect(store['startThread']).toHaveBeenCalledWith(null);

    startedThreadId.set('thread-3');
    fixture.detectChanges();

    expect(store['ask']).toHaveBeenCalledWith(text);
  });

  it('hides the openers once the thread has turns', () => {
    messages.set([
      { id: 'a1', role: 'user', body: 'hi', status: 'complete' } as unknown as AssistantMessage,
    ]);
    const fixture = build();

    expect(fixture.debugElement.query(By.css('[data-testid="assistant-suggestion"]'))).toBeNull();
  });

  it('picks up the most recent thread rather than opening blank', () => {
    // The deleted page listed past threads; without this the panel would strand
    // every earlier exchange.
    threads.set([{ id: 'thread-latest' }, { id: 'thread-older' }]);

    build();

    expect(store['openThread']).toHaveBeenCalledWith('thread-latest');
  });

  it('opens a fresh thread without dragging a stale question along', () => {
    const fixture = build();
    type(fixture, 'a question I abandoned');

    fixture.debugElement
      .query(By.css('[data-testid="assistant-new-thread"]'))
      .query(By.css('button'))
      .nativeElement.click();
    fixture.detectChanges();

    startedThreadId.set('thread-2');
    fixture.detectChanges();

    expect(store['openThread']).toHaveBeenCalledWith('thread-2');
    expect(store['ask']).not.toHaveBeenCalled();
  });
});

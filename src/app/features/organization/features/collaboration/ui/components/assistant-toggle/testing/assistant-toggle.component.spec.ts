import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AssistantStore } from '@features/organization/features/collaboration/state';
import { AssistantPanel } from '../../assistant-panel';
import { AssistantToggle } from '../assistant-toggle.component';

/**
 * Stands in for the real panel, whose own store surface is its spec's business
 * rather than this one's — the toggle owns the trigger and the sheet around it.
 */
@Component({
  selector: 'app-assistant-panel',
  template: '<p data-testid="assistant-panel-stub">panel</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AssistantPanelStub {}

/** The panel, which the sheet renders into an overlay outside the fixture. */
function panel(): HTMLElement | null {
  return document.querySelector('[data-testid="assistant-panel-stub"]');
}

describe('AssistantToggle', () => {
  let fixture: ComponentFixture<AssistantToggle>;
  let isAvailable: WritableSignal<boolean>;
  let panelOpen: WritableSignal<boolean>;
  let messages: WritableSignal<readonly unknown[]>;
  let toggleCalls: number;
  let newThreadCalls: number;

  /** The rendered control, or `null` when the widget renders nothing. */
  function control(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="assistant-toggle"]');
  }

  beforeEach(async () => {
    isAvailable = signal<boolean>(true);
    panelOpen = signal<boolean>(false);
    messages = signal<readonly unknown[]>([]);
    toggleCalls = 0;
    newThreadCalls = 0;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AssistantStore,
          useValue: {
            isAvailable,
            panelOpen,
            messages,
            startNewThread: (): void => {
              newThreadCalls += 1;
            },
            togglePanel: (): void => {
              toggleCalls += 1;
              panelOpen.update((open: boolean): boolean => !open);
            },
            openPanel: (): void => panelOpen.set(true),
            closePanel: (): void => panelOpen.set(false),
          },
        },
      ],
    });

    TestBed.overrideComponent(AssistantToggle, {
      remove: { imports: [AssistantPanel] },
      add: { imports: [AssistantPanelStub] },
    });

    fixture = TestBed.createComponent(AssistantToggle);
    await fixture.whenStable();
  });

  it('should render nothing without the assistant permission', async () => {
    isAvailable.set(false);
    await fixture.whenStable();

    expect(control()).toBeNull();
  });

  it('should open and close the panel', async () => {
    control()?.click();
    await fixture.whenStable();

    expect(toggleCalls).toBe(1);
    expect(panelOpen()).toBe(true);

    control()?.click();
    await fixture.whenStable();

    expect(panelOpen()).toBe(false);
  });

  it('should report what it controls and whether it is expanded', async () => {
    expect(control()?.getAttribute('aria-expanded')).toBe('false');
    expect(control()?.getAttribute('aria-controls')).toBe('assistant-sheet');

    panelOpen.set(true);
    await fixture.whenStable();

    expect(control()?.getAttribute('aria-expanded')).toBe('true');
  });

  it('should hold the panel in a sheet rather than the shell column', async () => {
    expect(panel()).toBeNull();

    panelOpen.set(true);
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
    expect(panel()?.closest('#assistant-sheet')).not.toBeNull();
  });

  it('should name the sheet through its own header title', async () => {
    panelOpen.set(true);
    await fixture.whenStable();

    const title: HTMLElement | null = document.querySelector('[data-slot="sheet-title"]');

    expect(title?.textContent?.trim()).toBe('Assistant');
    expect(document.querySelector('#assistant-sheet')?.getAttribute('data-slot')).toBe(
      'sheet-content',
    );
  });

  it('should offer a new thread only once the conversation has turns', async () => {
    panelOpen.set(true);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="assistant-new-thread"]')).toBeNull();

    messages.set([{ id: 'm-1' }]);
    await fixture.whenStable();

    (document.querySelector('[data-testid="assistant-new-thread"]') as HTMLButtonElement).click();

    expect(newThreadCalls).toBe(1);
  });
});

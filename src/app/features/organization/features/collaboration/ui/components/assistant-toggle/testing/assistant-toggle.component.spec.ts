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
  let toggleCalls: number;

  /** The rendered control, or `null` when the widget renders nothing. */
  function control(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="assistant-toggle"]');
  }

  beforeEach(async () => {
    isAvailable = signal<boolean>(true);
    panelOpen = signal<boolean>(false);
    toggleCalls = 0;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AssistantStore,
          useValue: {
            isAvailable,
            panelOpen,
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
});

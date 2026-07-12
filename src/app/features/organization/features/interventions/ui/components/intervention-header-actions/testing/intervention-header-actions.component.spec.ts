import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import {
  InterventionHeaderStore,
  interventionHeaderEvents,
  type InterventionHeaderStoreType,
} from '@features/organization/features/interventions/state';
import { InterventionHeaderActions } from '../intervention-header-actions.component';

type InterventionHeaderActionsHarness = {
  invokeCommand(): void;
  requestChanges(): void;
  navigatePrev(): void;
  navigateNext(): void;
};

describe('InterventionHeaderActions', () => {
  let dispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let headerStore: InterventionHeaderStoreType;

  beforeEach(() => {
    dispatcher = { dispatch: vi.fn() };
    TestBed.configureTestingModule({
      imports: [InterventionHeaderActions],
      providers: [{ provide: Dispatcher, useValue: dispatcher }],
    });
    headerStore = TestBed.inject(InterventionHeaderStore);
    headerStore.clear();
  });

  function build(): InterventionHeaderActionsHarness {
    const fixture = TestBed.createComponent(InterventionHeaderActions);
    return fixture.componentInstance as unknown as InterventionHeaderActionsHarness;
  }

  function dispatchedTypes(): readonly string[] {
    return dispatcher.dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
  }

  it('should expose no actions until the detail page publishes header state', () => {
    build();

    expect(headerStore.hasActions()).toBe(false);
  });

  it('should expose actions once header state is published', () => {
    headerStore.setHeader({
      commandAction: {
        label: 'Publish',
        icon: 'pi pi-check-circle',
        disabled: false,
        disabledReason: null,
        loading: false,
      },
      canRequestChanges: true,
      listPosition: '2 / 5',
      showPrevNext: true,
      prevDisabled: false,
      nextDisabled: true,
      overflowItems: [],
    });
    build();

    expect(headerStore.hasActions()).toBe(true);
  });

  it('should dispatch the header events the page listens to', () => {
    const harness = build();

    harness.invokeCommand();
    harness.requestChanges();
    harness.navigatePrev();
    harness.navigateNext();

    expect(dispatchedTypes()).toEqual([
      interventionHeaderEvents.commandInvoked().type,
      interventionHeaderEvents.changesRequested().type,
      interventionHeaderEvents.prevRequested().type,
      interventionHeaderEvents.nextRequested().type,
    ]);
  });
});

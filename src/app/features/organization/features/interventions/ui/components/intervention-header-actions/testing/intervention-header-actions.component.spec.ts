import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dispatcher } from '@ngrx/signals/events';
import {
  InterventionHeaderStore,
  interventionHeaderEvents,
  type InterventionHeaderStoreType,
} from '@features/organization/features/interventions/state';
import { installMatchMediaMock } from '@shared/testing';
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
  let fixture: ComponentFixture<InterventionHeaderActions>;

  // p-menu's popup positioning reads window.matchMedia — undefined in jsdom.
  beforeAll(() => installMatchMediaMock());

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
    fixture = TestBed.createComponent(InterventionHeaderActions);
    fixture.detectChanges();
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

  it('should render prev/next navigation with the list position', () => {
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: false,
      listPosition: '2 / 5',
      showPrevNext: true,
      prevDisabled: false,
      nextDisabled: true,
      overflowItems: [],
    });
    build();

    expect(fixture.nativeElement.textContent).toContain('2 / 5');
    const buttons = fixture.debugElement.queryAll(By.css('p-button'));
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should dispatch prevRequested when the previous button is clicked', () => {
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: false,
      listPosition: null,
      showPrevNext: true,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [],
    });
    build();

    const [prevButton] = fixture.debugElement.queryAll(By.css('p-button'));
    prevButton.triggerEventHandler('onClick', new MouseEvent('click'));
    fixture.detectChanges();

    expect(dispatchedTypes()).toContain(interventionHeaderEvents.prevRequested().type);
  });

  it('should render the request-changes action when allowed', () => {
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: true,
      listPosition: null,
      showPrevNext: false,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [],
    });
    build();

    expect(fixture.nativeElement.textContent).toContain('Request changes');
  });

  it('should render the command action with its disabled reason', () => {
    headerStore.setHeader({
      commandAction: {
        label: 'Publish',
        icon: 'pi pi-check-circle',
        disabled: true,
        disabledReason: 'Resolve blockers first',
        loading: false,
      },
      canRequestChanges: false,
      listPosition: null,
      showPrevNext: false,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [],
    });
    build();

    expect(fixture.nativeElement.textContent).toContain('Publish');
    expect(fixture.nativeElement.textContent).toContain('Resolve blockers first');
  });

  it('should render a single overflow entry as a direct button', () => {
    const command = vi.fn();
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: false,
      listPosition: null,
      showPrevNext: false,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [{ label: 'Archive', icon: 'pi pi-inbox', command }],
    });
    const harness = build();
    const singleButton = fixture.debugElement.queryAll(By.css('p-button')).at(-1);
    (
      harness as unknown as { invokeSingleOverflowItem(item: unknown): void }
    ).invokeSingleOverflowItem({ label: 'Archive', icon: 'pi pi-inbox', command });

    expect(singleButton).not.toBeNull();
    expect(command).toHaveBeenCalled();
  });

  it('should render an overflow menu trigger for multiple entries', () => {
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: false,
      listPosition: null,
      showPrevNext: false,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [
        { label: 'Archive', icon: 'pi pi-inbox' },
        { label: 'Delete', icon: 'pi pi-trash' },
      ],
    });
    build();

    expect(fixture.debugElement.query(By.css('p-menu'))).not.toBeNull();
  });

  it('should toggle the overflow menu when its trigger is clicked', () => {
    headerStore.setHeader({
      commandAction: null,
      canRequestChanges: false,
      listPosition: null,
      showPrevNext: false,
      prevDisabled: false,
      nextDisabled: false,
      overflowItems: [
        { label: 'Archive', icon: 'pi pi-inbox' },
        { label: 'Delete', icon: 'pi pi-trash' },
      ],
    });
    build();

    const trigger = fixture.debugElement.queryAll(By.css('p-button')).at(-1);
    expect(() => trigger?.triggerEventHandler('onClick', new MouseEvent('click'))).not.toThrow();
  });

  it('should render nothing when the store publishes no actions', () => {
    build();

    expect(fixture.debugElement.query(By.css('div'))).toBeNull();
  });
});

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  PLATFORM_ID,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { BrnDialogPhase, BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Subject } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { provideOrganizationFeature } from '@features/organization/organization.feature';
import { withGlobalSearch } from '@features/organization/providers/global-search';
import { MemberPresenceCoordinatorService } from '@features/organization/services/member-presence';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationGlobalSearch } from '@features/organization/ui/components/organization-global-search';
import { OrganizationGlobalSearchDialog } from '@features/organization/ui/dialogs/organization-global-search-dialog';
import { HlmDialogService } from '@shared/ui/dialog';
import { OrganizationGlobalSearchService } from '../organization-global-search.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class SearchTestHost {}

/**
 * Function dialogDouble
 * @description Native lifecycle double with separate closing and fully disposed phases.
 * @access private
 * @since 1.0.0
 * @returns {object} Typed dialog reference and its controllable disposal event.
 */
function dialogDouble() {
  const phase = signal<BrnDialogPhase>('open');
  const closed = new Subject<void>();
  const close = vi.fn(() => phase.set('closing'));
  const forceClose = vi.fn(() => {
    phase.set('closed');
    closed.next();
    closed.complete();
  });
  const ref = {
    phase,
    state: computed(() => (phase() === 'open' ? 'open' : 'closed')),
    closed$: closed.asObservable(),
    close,
    forceClose,
  } as unknown as BrnDialogRef<void>;
  return { ref, phase, closed, close, forceClose };
}

/**
 * Function shortcut
 * @description Dispatches the advertised browser shortcut without mounting a search widget.
 * @access private
 * @since 1.0.0
 * @param {KeyboardEventInit} [init] - Modifier and guard cases.
 * @param {EventTarget} [target] - Event origin, document by default.
 * @returns {KeyboardEvent} Cancelable event for native-default assertions.
 */
function shortcut(init: KeyboardEventInit = {}, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OrganizationGlobalSearchService', () => {
  let fixture: ComponentFixture<SearchTestHost>;
  let selectedOrganizationId: WritableSignal<string | null>;
  let isAuthenticated: WritableSignal<boolean>;
  let owner: OrganizationGlobalSearchService;
  let dialogs: { open: ReturnType<typeof vi.fn> };
  let palette: ReturnType<typeof dialogDouble>;

  async function setup(platform: 'browser' | 'server' = 'browser'): Promise<void> {
    selectedOrganizationId = signal<string | null>('org-1');
    isAuthenticated = signal(true);
    palette = dialogDouble();
    dialogs = { open: vi.fn().mockReturnValue(palette.ref) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated } },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { shortcutModifier: signal<'Ctrl'>('Ctrl') },
        },
        provideOrganizationFeature(),
        { provide: MemberPresenceCoordinatorService, useValue: {} },
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
        { provide: HlmDialogService, useValue: dialogs },
      ],
    });
    fixture = TestBed.createComponent(SearchTestHost);
    await fixture.whenStable();
    owner = TestBed.inject(OrganizationGlobalSearchService);
  }

  beforeEach(async () => {
    await setup();
  });

  it('keeps a remembered organization inert before authentication and MFA finish', () => {
    isAuthenticated.set(false);
    expect(shortcut().defaultPrevented).toBe(false);
    owner.open();
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('closes the existing palette when the authenticated session ends', async () => {
    owner.open();
    isAuthenticated.set(false);
    await fixture.whenStable();
    expect(palette.close).toHaveBeenCalledOnce();
  });

  it.each([
    { ctrlKey: true, metaKey: false },
    { ctrlKey: false, metaKey: true },
  ])('opens from the root initializer without any trigger for %j', (modifiers) => {
    expect(document.querySelector('app-organization-global-search')).toBeNull();
    expect(shortcut(modifiers).defaultPrevented).toBe(true);
    expect(dialogs.open).toHaveBeenCalledOnce();
    expect(dialogs.open).toHaveBeenCalledWith(
      OrganizationGlobalSearchDialog,
      expect.objectContaining({ restoreFocus: true }),
    );
    expect(owner.paletteVisible()).toBe(true);
  });

  it('does not allocate another listener or palette when contributions and triggers repeat', async () => {
    expect(withGlobalSearch().useFactory().component).toBe(OrganizationGlobalSearch);
    expect(withGlobalSearch().useFactory().component).toBe(OrganizationGlobalSearch);
    const first = TestBed.createComponent(OrganizationGlobalSearch);
    const second = TestBed.createComponent(OrganizationGlobalSearch);
    await first.whenStable();
    await second.whenStable();
    first.destroy();
    second.destroy();
    shortcut();
    expect(dialogs.open).toHaveBeenCalledOnce();
    expect(palette.close).not.toHaveBeenCalled();
    owner.open();
    expect(dialogs.open).toHaveBeenCalledOnce();
  });

  it('keeps the only dialog reference through native exit before allowing a fresh opening', () => {
    shortcut();
    shortcut();
    expect(palette.close).toHaveBeenCalledOnce();
    expect(owner.paletteVisible()).toBe(false);
    owner.open();
    expect(dialogs.open).toHaveBeenCalledOnce();
    palette.forceClose();
    owner.open();
    expect(dialogs.open).toHaveBeenCalledTimes(2);
  });

  it.each(['input', 'textarea', 'select'])('does not steal shortcuts from a page %s', (tag) => {
    const field = document.createElement(tag);
    document.body.append(field);
    try {
      expect(shortcut({}, field).defaultPrevented).toBe(false);
      expect(dialogs.open).not.toHaveBeenCalled();
    } finally {
      field.remove();
    }
  });

  it('protects nested editable content and ARIA textboxes', () => {
    const editor = document.createElement('div');
    const child = document.createElement('span');
    editor.setAttribute('contenteditable', 'true');
    editor.append(child);
    document.body.append(editor);
    try {
      expect(shortcut({}, child).defaultPrevented).toBe(false);
      editor.removeAttribute('contenteditable');
      editor.setAttribute('role', 'textbox');
      expect(shortcut({}, child).defaultPrevented).toBe(false);
      expect(dialogs.open).not.toHaveBeenCalled();
    } finally {
      editor.remove();
    }
  });

  it('can toggle closed while typing in the already-open palette', () => {
    owner.open();
    const field = document.createElement('input');
    document.body.append(field);
    try {
      expect(shortcut({}, field).defaultPrevented).toBe(true);
      expect(palette.close).toHaveBeenCalledOnce();
    } finally {
      field.remove();
    }
  });

  it.each([
    { repeat: true },
    { isComposing: true },
    { altKey: true },
    { shiftKey: true },
    { key: 'Escape' },
    { ctrlKey: false, metaKey: false },
  ])('ignores unrelated or unsafe keyboard input %j', (init) => {
    expect(shortcut(init).defaultPrevented).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('respects an already-handled event and the missing-organization guard', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true });
    event.preventDefault();
    document.dispatchEvent(event);
    expect(dialogs.open).not.toHaveBeenCalled();
    selectedOrganizationId.set(null);
    expect(shortcut().defaultPrevented).toBe(false);
    owner.open();
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('uses a connected trigger for native focus restoration and releases detached context', () => {
    const button = document.createElement('button');
    document.body.append(button);
    const release = owner.registerTrigger(button, null);
    try {
      owner.open();
      expect(dialogs.open).toHaveBeenLastCalledWith(
        OrganizationGlobalSearchDialog,
        expect.objectContaining({ restoreFocus: button }),
      );
      palette.forceClose();
      release();
      owner.open();
      expect(dialogs.open).toHaveBeenLastCalledWith(
        OrganizationGlobalSearchDialog,
        expect.objectContaining({ id: 'organization-global-search', restoreFocus: true }),
      );
    } finally {
      release();
      button.remove();
    }
  });

  it('waits for native parent disposal, even after its trigger is destroyed', () => {
    const parent = dialogDouble();
    const button = document.createElement('button');
    document.body.append(button);
    const release = owner.registerTrigger(button, parent.ref);
    owner.open();
    owner.open();
    expect(parent.close).toHaveBeenCalledOnce();
    expect(dialogs.open).not.toHaveBeenCalled();
    release();
    button.remove();
    parent.forceClose();
    expect(dialogs.open).toHaveBeenCalledOnce();
    expect(dialogs.open).toHaveBeenCalledWith(
      OrganizationGlobalSearchDialog,
      expect.objectContaining({ restoreFocus: true }),
    );
  });

  it('abandons a queued opening when the organization changes', () => {
    const parent = dialogDouble();
    const button = document.createElement('button');
    document.body.append(button);
    const release = owner.registerTrigger(button, parent.ref);
    owner.open();
    selectedOrganizationId.set('org-2');
    parent.forceClose();
    expect(dialogs.open).not.toHaveBeenCalled();
    release();
    button.remove();
  });

  it('removes its listener and closes its owned palette on injector teardown', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    owner.open();
    TestBed.resetTestingModule();
    expect(palette.forceClose).toHaveBeenCalledOnce();
    expect(remove.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    dialogs.open.mockClear();
    shortcut();
    owner.open();
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('does not attach a keyboard listener or open dialogs in SSR', async () => {
    TestBed.resetTestingModule();
    const add = vi.spyOn(document, 'addEventListener');
    await setup('server');
    owner.open();
    shortcut();
    expect(dialogs.open).not.toHaveBeenCalled();
    expect(add.mock.calls.some(([type]) => type === 'keydown')).toBe(false);
    expect(owner.shortcutModifier()).toBe('Ctrl');
  });
});

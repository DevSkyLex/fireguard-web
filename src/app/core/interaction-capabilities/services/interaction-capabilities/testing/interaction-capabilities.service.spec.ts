import { DOCUMENT, PLATFORM_ID, REQUEST, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideInteractionCapabilities } from '../../../interaction-capabilities.provider';
import { INTERACTION_CAPABILITIES_PORT } from '../../../ports';
import {
  INTERACTION_MODE_STATE_KEY,
  InteractionCapabilitiesService,
} from '../interaction-capabilities.service';

describe('InteractionCapabilitiesService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-interaction-mode');
  });

  describe('browser', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Linux armv8l');
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Linux; Android 16; Tablet');
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    });

    it('initializes at app startup and binds the same service to the shared port', () => {
      TestBed.configureTestingModule({ providers: [provideInteractionCapabilities()] });
      TestBed.tick();

      expect(document.documentElement.getAttribute('data-interaction-mode')).toBe('mobile');
      expect(TestBed.inject(INTERACTION_CAPABILITIES_PORT)).toBe(
        TestBed.inject(InteractionCapabilitiesService),
      );
      expect(TestBed.inject(INTERACTION_CAPABILITIES_PORT).shortcutModifier()).toBe('Ctrl');
      expect(Object.hasOwn(TestBed.inject(INTERACTION_CAPABILITIES_PORT), 'ready')).toBe(false);
    });

    it('keeps Windows shortcuts when the user agent contains synthetic Apple evidence', () => {
      vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32');
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      );
      const service = TestBed.inject(InteractionCapabilitiesService);

      TestBed.tick();

      expect(service.shortcutModifier()).toBe('Ctrl');
    });

    it('uses Command for an Apple browser platform', () => {
      vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0');
      const service = TestBed.inject(InteractionCapabilitiesService);

      TestBed.tick();

      expect(service.shortcutModifier()).toBe('⌘');
    });

    it('uses the transferred mobile branch before automatic detection completes', () => {
      const transferState = TestBed.inject(TransferState);
      transferState.set(INTERACTION_MODE_STATE_KEY, 'mobile');
      const service = TestBed.inject(InteractionCapabilitiesService);

      expect(service.interactionMode()).toBe('mobile');
      expect(service.isMobileInteractionMode()).toBe(true);
      expect(matchMedia).not.toHaveBeenCalled();
      expect(document.documentElement.getAttribute('data-interaction-mode')).toBe('mobile');
      expect(transferState.hasKey(INTERACTION_MODE_STATE_KEY)).toBe(false);

      TestBed.tick();

      expect(service.interactionMode()).toBe('mobile');
      expect(service.isMobileInteractionMode()).toBe(true);
      expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(any-pointer: coarse)');
      expect(document.documentElement.getAttribute('data-interaction-mode')).toBe('mobile');
    });

    it('does not classify again after viewport or input events', () => {
      const service = TestBed.inject(InteractionCapabilitiesService);
      TestBed.tick();
      vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32');
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

      for (const name of [
        'resize',
        'orientationchange',
        'pointerdown',
        'mousemove',
        'touchstart',
        'keydown',
      ]) {
        window.dispatchEvent(new Event(name));
        document.dispatchEvent(new Event(name));
      }
      TestBed.tick();

      expect(service.interactionMode()).toBe('mobile');
      expect(matchMedia).not.toHaveBeenCalled();
    });

    it('fails safely when browser media APIs are unavailable', () => {
      vi.stubGlobal('matchMedia', undefined);
      const service = TestBed.inject(InteractionCapabilitiesService);
      TestBed.tick();

      expect(service.interactionMode()).toBe('desktop');
      expect(service.isMobileInteractionMode()).toBe(false);
      expect(document.documentElement.getAttribute('data-interaction-mode')).toBe('desktop');
    });

    it('preserves the initial mode when a capability API throws', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => {
          throw new Error('unavailable');
        }),
      );
      const service = TestBed.inject(InteractionCapabilitiesService);
      TestBed.tick();

      expect(service.interactionMode()).toBe('desktop');
      expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(any-pointer: coarse)');
      expect(document.documentElement.getAttribute('data-interaction-mode')).toBe('desktop');
    });
  });

  describe('SSR', () => {
    it('renders a common phone shell from request evidence and transfers the decision', () => {
      const serverDocument = document.implementation.createHTMLDocument();
      const request = new Request('https://fireguard.local/organizations/current', {
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
          'sec-ch-ua-mobile': '?1',
        },
      });
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: DOCUMENT, useValue: serverDocument },
          { provide: REQUEST, useValue: request },
          provideInteractionCapabilities(),
        ],
      });

      const service = TestBed.inject(InteractionCapabilitiesService);
      TestBed.tick();

      expect(service.interactionMode()).toBe('mobile');
      expect(service.isMobileInteractionMode()).toBe(true);
      expect(serverDocument.documentElement.getAttribute('data-interaction-mode')).toBe('mobile');
      expect(TestBed.inject(TransferState).get(INTERACTION_MODE_STATE_KEY, 'desktop')).toBe(
        'mobile',
      );
    });

    it('supports request-less rendering and a document without a browser window', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: DOCUMENT, useValue: document.implementation.createHTMLDocument() },
        ],
      });

      const service = TestBed.inject(InteractionCapabilitiesService);

      expect(service.interactionMode()).toBe('desktop');
      expect(service.isMobileInteractionMode()).toBe(false);
      expect(service.shortcutModifier()).toBe('Ctrl');
    });
  });
});

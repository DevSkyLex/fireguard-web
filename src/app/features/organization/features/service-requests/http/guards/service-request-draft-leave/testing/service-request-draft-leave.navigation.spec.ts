import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { THEME_PORT } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  EquipmentService,
  EquipmentTypeService,
} from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ServiceRequestService } from '@features/organization/features/service-requests/data-access';
import type { ServiceRequestOutput } from '@features/organization/features/service-requests/models';
import { serviceRequestFixture } from '@features/organization/features/service-requests/models/service-request/testing/service-request.fixture';
import { SERVICE_REQUEST_ROUTES } from '@features/organization/features/service-requests/service-requests.routes';
import { ServiceRequestStore } from '@features/organization/features/service-requests/state';
import { serviceRequestContext } from '@features/organization/features/service-requests/state/service-request/testing/service-request-context.fixture';
import { ServiceRequestEditorSheet } from '@features/organization/features/service-requests/ui/sheets/service-request-editor-sheet/service-request-editor-sheet.component';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrganizationMemberAccessStore } from '@features/organization/state';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';

@Component({ template: 'Destination', changeDetection: ChangeDetectionStrategy.OnPush })
class DestinationPage {}

describe('serviceRequestDraftLeaveGuard', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function render(
    pageKind: 'directory' | 'detail',
    journalState: 'ready' | 'pending' | 'error' = 'ready',
  ) {
    const request = serviceRequestFixture();
    const context = serviceRequestContext();
    if (journalState === 'pending')
      context.journal.readPending.mockImplementation(() => new Promise(() => {}));
    if (journalState === 'error')
      context.journal.readPending.mockRejectedValue(new Error('Storage unavailable'));
    const api = {
      list: vi.fn().mockReturnValue(of({ member: [request], totalItems: 1 })),
      get: vi.fn().mockReturnValue(of(request)),
      create: vi.fn().mockReturnValue(of(request)),
      update: vi.fn().mockReturnValue(of(request)),
    };
    TestBed.configureTestingModule({
      providers: [
        ...context.providers,
        provideRouter(
          [
            {
              path: 'organizations/:organizationId/service-requests',
              children: SERVICE_REQUEST_ROUTES,
            },
            { path: 'auth/login', component: DestinationPage },
            { path: 'other', component: DestinationPage },
          ],
          withComponentInputBinding(),
        ),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ServiceRequestService, useValue: api },
        {
          provide: EquipmentService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            listByFacility: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            get: vi.fn(),
            openWork: vi.fn(),
          },
        },
        { provide: EquipmentTypeService, useValue: { listAll: vi.fn().mockReturnValue(of([])) } },
        {
          provide: FacilityService,
          useValue: {
            list: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
            get: vi.fn(),
          },
        },
        { provide: ConnectivityService, useValue: { isOnline: signal(true) } },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string) => context.grants().includes(permission),
            canAccessOrganization: () => true,
          },
        },
        {
          provide: OrganizationMemberAccessStore,
          useValue: { ensureAccessResolved: () => of(undefined) },
        },
        { provide: FeedbackService, useValue: { warn: vi.fn() } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: signal(false),
            interactionMode: signal('desktop'),
            shortcutModifier: signal('Control'),
          },
        },
      ],
    });
    const url = `/organizations/org/service-requests${pageKind === 'detail' ? '/request' : ''}`;
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    const routed = harness.routeDebugElement;
    if (!routed) throw new Error('The routed request page is missing.');
    const store = routed.injector.get(ServiceRequestStore);
    const destroyed = vi.fn();
    routed.injector.get(DestroyRef).onDestroy(destroyed);
    const sheet = routed.query(By.directive(ServiceRequestEditorSheet))
      .componentInstance as ServiceRequestEditorSheet;
    return { harness, context, api, url, store, sheet, destroyed };
  }

  describe.each(['directory', 'detail'] as const)('%s page navigation', (pageKind) => {
    it.each(['logout', 'session expiration'] as const)(
      'allows the login redirect after %s while journal restoration is pending',
      async (termination) => {
        const rendered = await render(pageKind, 'pending');
        expect(rendered.store.commandCallState().status).toBe('pending');
        expect(rendered.store.commandsReady()).toBe(false);
        rendered.context.authenticated.set(false);
        rendered.context.revision.update((revision) => revision + 1);
        const login =
          termination === 'logout'
            ? '/auth/login'
            : `/auth/login?returnUrl=${encodeURIComponent(rendered.url)}`;
        expect(await TestBed.inject(Router).navigateByUrl(login, { replaceUrl: true })).toBe(true);
        expect(TestBed.inject(Router).url).toBe(login);
        expect(rendered.destroyed).toHaveBeenCalledOnce();
      },
    );

    it.each(['pending', 'error'] as const)(
      'allows ordinary navigation while journal restoration is %s without an editor or write',
      async (journalState) => {
        const rendered = await render(pageKind, journalState);
        expect(rendered.context.authenticated()).toBe(true);
        expect(rendered.store.commandCallState().status).toBe(journalState);
        expect(rendered.store.commandsReady()).toBe(false);
        expect(rendered.store.writeCallState().status).toBe('idle');
        expect(rendered.sheet.visible()).toBe(false);
        await rendered.harness.navigateByUrl('/other', DestinationPage);
        expect(rendered.destroyed).toHaveBeenCalledOnce();
      },
    );

    it('blocks ordinary pending-write navigation until the local session ends', async () => {
      const rendered = await render(pageKind);
      const accepted = new Subject<ServiceRequestOutput>();
      rendered.api.create.mockReturnValue(accepted);
      rendered.api.update.mockReturnValue(accepted);
      const action =
        pageKind === 'directory'
          ? rendered.harness.routeNativeElement?.querySelector<HTMLButtonElement>(
              '[data-testid="service-request-new"]',
            )
          : [...(rendered.harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
              (button) => button.textContent?.trim() === 'Edit',
            );
      if (!action) throw new Error('The request editor action is missing.');
      action.click();
      await rendered.harness.fixture.whenStable();
      rendered.sheet.descriptionSubmitted.emit({
        title: 'Retained maintenance write',
        description: 'Repair the damaged gauge.',
        equipmentId: 'equipment',
      });
      await rendered.harness.fixture.whenStable();
      expect(rendered.store.writeCallState().status).toBe('pending');
      expect(await TestBed.inject(Router).navigateByUrl('/other')).toBe(false);
      expect(TestBed.inject(Router).url).toBe(rendered.url);
      expect(rendered.destroyed).not.toHaveBeenCalled();
      expect(accepted.observed).toBe(true);
      rendered.context.authenticated.set(false);
      expect(rendered.store.commandsReady()).toBe(false);
      expect(await TestBed.inject(Router).navigateByUrl('/auth/login')).toBe(true);
      expect(rendered.destroyed).toHaveBeenCalledOnce();
    });

    it('retains a real dirty editor when the authenticated reader cancels navigation', async () => {
      const rendered = await render(pageKind);
      const action =
        pageKind === 'directory'
          ? rendered.harness.routeNativeElement?.querySelector<HTMLButtonElement>(
              '[data-testid="service-request-new"]',
            )
          : [...(rendered.harness.routeNativeElement?.querySelectorAll('button') ?? [])].find(
              (button) => button.textContent?.trim() === 'Edit',
            );
      if (!action) throw new Error('The request editor action is missing.');
      action.click();
      await rendered.harness.fixture.whenStable();
      const title = document.querySelector<HTMLInputElement>('#service-request-title');
      if (!title) throw new Error('The real request editor title is missing.');
      title.value = 'Retain this entered draft';
      title.dispatchEvent(new Event('input', { bubbles: true }));
      await rendered.harness.fixture.whenStable();
      expect(rendered.sheet.hasDirty()).toBe(true);
      const navigation = TestBed.inject(Router).navigateByUrl('/other');
      await vi.waitFor(() => {
        rendered.harness.detectChanges();
        expect(document.querySelector('[data-testid="unsaved-changes-dialog"]')).not.toBeNull();
      });
      const cancel = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[data-testid="unsaved-changes-dialog"] button',
        ),
      ].find((button) => button.textContent?.trim() === 'Cancel');
      if (!cancel) throw new Error('The native discard confirmation cancel action is missing.');
      cancel.click();
      expect(await navigation).toBe(false);
      expect(TestBed.inject(Router).url).toBe(rendered.url);
      expect(title.value).toBe('Retain this entered draft');
      expect(rendered.sheet.hasDirty()).toBe(true);
      expect(rendered.destroyed).not.toHaveBeenCalled();
      rendered.context.authenticated.set(false);
      expect(await TestBed.inject(Router).navigateByUrl('/auth/login')).toBe(true);
      expect(document.querySelector('[data-testid="unsaved-changes-dialog"]')).toBeNull();
      expect(rendered.destroyed).toHaveBeenCalledOnce();
    });
  });
});

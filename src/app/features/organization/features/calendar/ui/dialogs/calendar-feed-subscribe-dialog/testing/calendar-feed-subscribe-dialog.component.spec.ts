import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import type { CalendarFeedTokenSecretOutput } from '@features/organization/features/calendar/models';
import { CalendarFeedSubscribeDialog } from '../calendar-feed-subscribe-dialog.component';

const NOT_FOUND: ApiError = {
  '@id': '/errors/404',
  '@type': 'Error',
  status: 404,
  type: 'about:blank',
  title: 'Not Found',
  detail: 'No active feed token.',
};

function generate(): void {
  document
    .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
    ?.click();
}

describe('CalendarFeedSubscribeDialog', () => {
  let fixture: ComponentFixture<CalendarFeedSubscribeDialog>;
  let sessionRevision: WritableSignal<number>;
  let authenticated: WritableSignal<boolean>;
  let serviceMock: {
    getFeedTokenMetadata: ReturnType<typeof vi.fn>;
    createFeedToken: ReturnType<typeof vi.fn>;
    revokeFeedToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionRevision = signal(1);
    authenticated = signal(true);
    serviceMock = {
      getFeedTokenMetadata: vi.fn().mockReturnValue(throwError(() => NOT_FOUND)),
      createFeedToken: vi.fn(),
      revokeFeedToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AUTH_SESSION_PORT,
          useValue: { sessionRevision, isAuthenticated: authenticated },
        },
        { provide: CalendarService, useValue: serviceMock },
      ],
    });

    fixture = TestBed.createComponent(CalendarFeedSubscribeDialog);
    fixture.componentRef.setInput('organizationId', 'org-1');
  });

  async function open(): Promise<void> {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  }

  it('should show the explanation and Generate when the member holds no token', async () => {
    await open();

    expect(serviceMock.getFeedTokenMetadata).toHaveBeenCalledWith('org-1');
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-empty"]')).not.toBeNull();
    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-generate"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-error"]')).toBeNull();
  });

  it('should show the one-time URL in a readonly field after a generation', async () => {
    serviceMock.createFeedToken.mockReturnValue(
      of({
        secret: 'raw-secret',
        feedUrl: 'https://api.test/api/calendar/feed/raw-secret.ics',
        createdAt: '2026-08-28T10:00:00+00:00',
        rotated: false,
      }),
    );
    await open();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();

    const urlField: HTMLInputElement | null = document.querySelector<HTMLInputElement>(
      '[data-testid="calendar-feed-subscribe-url"]',
    );
    expect(serviceMock.createFeedToken).toHaveBeenCalledWith('org-1', {
      idempotencyKey: expect.any(String),
    });
    expect(urlField?.value).toBe('https://api.test/api/calendar/feed/raw-secret.ics');
    expect(urlField?.readOnly).toBe(true);
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-empty"]')).toBeNull();
  });

  it('should announce Copied through the live region after copying', async () => {
    serviceMock.createFeedToken.mockReturnValue(
      of({
        secret: 'raw-secret',
        feedUrl: 'https://api.test/api/calendar/feed/raw-secret.ics',
        createdAt: '2026-08-28T10:00:00+00:00',
        rotated: false,
      }),
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-copy"]')
      ?.click();
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="calendar-feed-subscribe-copy-live"]')?.textContent,
      ).toContain('Feed URL copied');
    });

    expect(writeText).toHaveBeenCalledWith('https://api.test/api/calendar/feed/raw-secret.ics');
    vi.unstubAllGlobals();
  });

  it('should show the metadata with Regenerate and Revoke when a token exists', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-01T08:00:00+00:00' }),
    );
    await open();

    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-metadata"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-last-used-at"]')?.textContent,
    ).toContain('Never');
    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-regenerate"]'),
    ).not.toBeNull();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-revoke"]')).not.toBeNull();
  });

  it('should only revoke after the in-dialog confirmation and return to the empty state', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-01T08:00:00+00:00' }),
    );
    serviceMock.revokeFeedToken.mockReturnValue(of(undefined));
    await open();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-revoke"]')
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.revokeFeedToken).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-revoke-confirm"]'),
    ).not.toBeNull();

    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-revoke-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.revokeFeedToken).toHaveBeenCalledWith('org-1', {
      idempotencyKey: expect.any(String),
    });
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-empty"]')).not.toBeNull();
  });

  it('should arm the regenerate confirmation and rotate through the create endpoint', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-01T08:00:00+00:00' }),
    );
    serviceMock.createFeedToken.mockReturnValue(
      of({
        secret: 'next-secret',
        feedUrl: 'https://api.test/api/calendar/feed/next-secret.ics',
        createdAt: '2026-08-28T11:00:00+00:00',
        rotated: true,
      }),
    );
    await open();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-regenerate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken).toHaveBeenCalledWith('org-1', {
      idempotencyKey: expect.any(String),
    });
    const urlField: HTMLInputElement | null = document.querySelector<HTMLInputElement>(
      '[data-testid="calendar-feed-subscribe-url"]',
    );
    expect(urlField?.value).toBe('https://api.test/api/calendar/feed/next-secret.ics');
  });

  it('should render a load rejection other than 404 inline', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      throwError(() => ({ ...NOT_FOUND, status: 500, title: 'Server Error' })),
    );
    await open();

    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-error"]')?.textContent,
    ).toContain('could not be loaded');
  });

  it('should retain the generation identity when a lost response is retried', async () => {
    serviceMock.createFeedToken
      .mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(
        of({
          secret: 'original-secret',
          feedUrl: 'https://api.test/api/calendar/feed/original-secret.ics',
          createdAt: '2026-08-28T10:00:00+00:00',
          rotated: false,
        }),
      );
    await open();
    generate();
    await fixture.whenStable();
    generate();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken).toHaveBeenCalledTimes(2);
    expect(serviceMock.createFeedToken.mock.calls[1]).toEqual(
      serviceMock.createFeedToken.mock.calls[0],
    );
    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-feed-subscribe-url"]')
        ?.value,
    ).toBe('https://api.test/api/calendar/feed/original-secret.ics');
  });

  it('should start a new creation after revoking a rotation whose response was lost', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-01T08:00:00+00:00' }),
    );
    serviceMock.createFeedToken
      .mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(
        of({
          secret: 'new-secret',
          feedUrl: 'https://api.test/api/calendar/feed/new-secret.ics',
          createdAt: '2026-08-28T10:00:00+00:00',
          rotated: false,
        }),
      );
    serviceMock.revokeFeedToken.mockReturnValue(of(undefined));
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-regenerate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm"] button',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-revoke"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-revoke-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();
    generate();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken).toHaveBeenCalledTimes(2);
    expect(serviceMock.createFeedToken.mock.calls[1]?.[1]).not.toEqual(
      serviceMock.createFeedToken.mock.calls[0]?.[1],
    );
    expect(serviceMock.revokeFeedToken).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector<HTMLInputElement>('[data-testid="calendar-feed-subscribe-url"]')
        ?.value,
    ).toBe('https://api.test/api/calendar/feed/new-secret.ics');
  });

  it('should preserve both failed write intentions until revocation succeeds', async () => {
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-01T08:00:00+00:00' }),
    );
    serviceMock.createFeedToken.mockReturnValue(throwError(() => ({ status: 0 })));
    serviceMock.revokeFeedToken
      .mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(of(undefined));
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-regenerate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm"] button',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-revoke"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-revoke-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-revoke-confirm"] button',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-regenerate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken.mock.calls[1]).toEqual(
      serviceMock.createFeedToken.mock.calls[0],
    );
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm"] button',
      )
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-revoke"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-revoke-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();
    expect(serviceMock.revokeFeedToken.mock.calls[1]).toEqual(
      serviceMock.revokeFeedToken.mock.calls[0],
    );
    generate();
    await fixture.whenStable();
    expect(serviceMock.createFeedToken.mock.calls[2]?.[1]).not.toEqual(
      serviceMock.createFeedToken.mock.calls[0]?.[1],
    );
  });

  it('should keep an expired secret replay under the same identity without automatic rotation', async () => {
    serviceMock.createFeedToken.mockReturnValue(
      throwError(() => ({
        status: 409,
        code: 'idempotency_replay_expired',
        operationCompleted: true,
      })),
    );
    await open();

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken).toHaveBeenCalledTimes(1);
    expect(serviceMock.getFeedTokenMetadata).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();
    expect(
      document.querySelector('[data-testid="calendar-feed-subscribe-error"]')?.textContent,
    ).toContain('secure display period has ended');

    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();
    expect(serviceMock.createFeedToken.mock.calls[1]).toEqual(
      serviceMock.createFeedToken.mock.calls[0],
    );
  });

  it('should clear displayed secrets on closing and use a fresh identity for an explicit later rotation', async () => {
    serviceMock.createFeedToken.mockReturnValue(
      of({
        secret: 'raw-secret',
        feedUrl: 'https://api.test/api/calendar/feed/raw-secret.ics',
        createdAt: '2026-08-28T10:00:00+00:00',
        rotated: false,
      }),
    );
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-close"]')
      ?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    serviceMock.getFeedTokenMetadata.mockReturnValue(
      of({ createdAt: '2026-08-28T10:00:00+00:00' }),
    );
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-regenerate"]')
      ?.click();
    await fixture.whenStable();
    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="calendar-feed-subscribe-regenerate-confirm-button"]',
      )
      ?.click();
    await fixture.whenStable();

    expect(serviceMock.createFeedToken.mock.calls[1]?.[1]).not.toEqual(
      serviceMock.createFeedToken.mock.calls[0]?.[1],
    );
  });

  it('should fence a late secret after an organization change and clear the previous intention', async () => {
    const pending = new Subject<CalendarFeedTokenSecretOutput>();
    serviceMock.createFeedToken
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(throwError(() => ({ status: 0 })));
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    fixture.componentRef.setInput('organizationId', 'org-2');
    pending.next({
      '@id': '/api/organizations/org-1/calendar/feed-token',
      '@type': 'CalendarFeedToken',
      secret: 'departed-secret',
      feedUrl: 'https://api.test/api/calendar/feed/departed-secret.ics',
      createdAt: '2026-08-28T10:00:00+00:00',
      rotated: false,
    });
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();
    expect(serviceMock.createFeedToken.mock.calls[1]?.[0]).toBe('org-2');
    expect(serviceMock.createFeedToken.mock.calls[1]?.[1]).not.toEqual(
      serviceMock.createFeedToken.mock.calls[0]?.[1],
    );
  });

  it('should fence a late secret after session replacement and discard its retry identity', async () => {
    const pending = new Subject<CalendarFeedTokenSecretOutput>();
    serviceMock.createFeedToken
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(throwError(() => ({ status: 0 })));
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    sessionRevision.set(2);
    pending.next({
      '@id': '/api/organizations/org-1/calendar/feed-token',
      '@type': 'CalendarFeedToken',
      secret: 'previous-session-secret',
      feedUrl: 'https://api.test/api/calendar/feed/previous-session-secret.ics',
      createdAt: '2026-08-28T10:00:00+00:00',
      rotated: false,
    });
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    await fixture.whenStable();
    expect(serviceMock.createFeedToken.mock.calls[1]?.[1]).not.toEqual(
      serviceMock.createFeedToken.mock.calls[0]?.[1],
    );
  });

  it('should not expose a pending secret after external dismissal or destruction', async () => {
    const pending = new Subject<CalendarFeedTokenSecretOutput>();
    serviceMock.createFeedToken.mockReturnValue(pending);
    await open();
    document
      .querySelector<HTMLButtonElement>('[data-testid="calendar-feed-subscribe-generate"]')
      ?.click();
    fixture.componentRef.setInput('visible', false);
    pending.next({
      '@id': '/api/organizations/org-1/calendar/feed-token',
      '@type': 'CalendarFeedToken',
      secret: 'dismissed-secret',
      feedUrl: 'https://api.test/api/calendar/feed/dismissed-secret.ics',
      createdAt: '2026-08-28T10:00:00+00:00',
      rotated: false,
    });
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();
    fixture.destroy();
    expect(pending.observed).toBe(false);
  });

  it('should clear a shown secret and suppress requests after session loss', async () => {
    serviceMock.createFeedToken.mockReturnValue(
      of({
        secret: 'session-secret',
        feedUrl: 'https://api.test/api/calendar/feed/session-secret.ics',
        createdAt: '2026-08-28T10:00:00+00:00',
        rotated: false,
      }),
    );
    await open();
    generate();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).not.toBeNull();
    authenticated.set(false);
    sessionRevision.set(2);
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="calendar-feed-subscribe-secret"]')).toBeNull();
    generate();
    await fixture.whenStable();
    expect(serviceMock.createFeedToken).toHaveBeenCalledTimes(1);
    expect(serviceMock.getFeedTokenMetadata).toHaveBeenCalledTimes(1);
  });

  it('should reject a stale submission before the organization-reset effect runs', async () => {
    serviceMock.createFeedToken.mockReturnValue(throwError(() => ({ status: 0 })));
    await open();
    fixture.componentRef.setInput('organizationId', 'org-2');
    generate();
    expect(serviceMock.createFeedToken).not.toHaveBeenCalled();
    await fixture.whenStable();
    generate();
    expect(serviceMock.createFeedToken.mock.calls[0]?.[0]).toBe('org-2');
  });

  it('should reject a stale submission before the session-reset effect runs', async () => {
    serviceMock.createFeedToken.mockReturnValue(throwError(() => ({ status: 0 })));
    await open();
    sessionRevision.set(2);
    generate();
    expect(serviceMock.createFeedToken).not.toHaveBeenCalled();
    await fixture.whenStable();
    generate();
    expect(serviceMock.createFeedToken).toHaveBeenCalledTimes(1);
  });
});

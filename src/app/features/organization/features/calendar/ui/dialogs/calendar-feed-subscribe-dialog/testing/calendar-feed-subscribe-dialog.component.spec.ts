import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ApiError } from '@core/api/models';
import { CalendarService } from '@features/organization/features/calendar/data-access';
import { CalendarFeedSubscribeDialog } from '../calendar-feed-subscribe-dialog.component';

const NOT_FOUND: ApiError = {
  '@id': '/errors/404',
  '@type': 'Error',
  status: 404,
  type: 'about:blank',
  title: 'Not Found',
  detail: 'No active feed token.',
};

describe('CalendarFeedSubscribeDialog', () => {
  let fixture: ComponentFixture<CalendarFeedSubscribeDialog>;
  let serviceMock: {
    getFeedTokenMetadata: ReturnType<typeof vi.fn>;
    createFeedToken: ReturnType<typeof vi.fn>;
    revokeFeedToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    serviceMock = {
      getFeedTokenMetadata: vi.fn().mockReturnValue(throwError(() => NOT_FOUND)),
      createFeedToken: vi.fn(),
      revokeFeedToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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
    expect(serviceMock.createFeedToken).toHaveBeenCalledWith('org-1');
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

    expect(serviceMock.revokeFeedToken).toHaveBeenCalledWith('org-1');
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

    expect(serviceMock.createFeedToken).toHaveBeenCalledWith('org-1');
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
});

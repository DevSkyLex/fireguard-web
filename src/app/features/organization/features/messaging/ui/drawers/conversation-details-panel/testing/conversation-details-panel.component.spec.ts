import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { of } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import {
  OrganizationMemberDirectoryStore,
  type MemberIdentity,
} from '@features/organization/state';
import { ConversationDetailsPanel } from '../conversation-details-panel.component';

const collection = <T>(member: readonly T[], totalItems: number = member.length) =>
  of({ member, totalItems });

const conversation = (over: Partial<ConversationOutput>): ConversationOutput =>
  ({
    id: 'c1',
    organization: '/api/organizations/org-1',
    subjectType: 'channel',
    subject: null,
    subjectLabel: null,
    visibility: 'participants',
    lastMessageAt: null,
    messagesCount: 0,
    isArchived: false,
    unreadCount: 0,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    isChannel: true,
    name: null,
    team: null,
    isFavorite: false,
    parentConversationId: null,
    ...over,
  }) as ConversationOutput;

describe('ConversationDetailsPanel', () => {
  let fixture: ComponentFixture<ConversationDetailsPanel>;
  let conversations: WritableSignal<readonly ConversationOutput[]>;
  let identities: WritableSignal<ReadonlyMap<string, MemberIdentity>>;
  let listConversationLinks: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  const render = (): void => {
    fixture = TestBed.createComponent(ConversationDetailsPanel);
    fixture.detectChanges();
  };

  const all = (testId: string): readonly HTMLElement[] =>
    fixture.debugElement
      .queryAll(By.css(`[data-testid="${testId}"]`))
      .map((debug) => debug.nativeElement as HTMLElement);

  const at = (testId: string): HTMLElement | null => all(testId)[0] ?? null;

  const openTab = (tab: string): void => {
    at(`details-tab-${tab}`)?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    conversations = signal<readonly ConversationOutput[]>([conversation({ id: 'c1' })]);
    identities = signal<ReadonlyMap<string, MemberIdentity>>(new Map());
    listConversationLinks = vi.fn(() => collection([]));
    navigate = vi.fn();

    const url: string = '/organizations/org-1/messages?conversation=c1';

    TestBed.configureTestingModule({
      imports: [ConversationDetailsPanel],
      providers: [
        { provide: ENV_CONFIG, useValue: { apiUrl: 'http://localhost' } },
        {
          provide: Router,
          useValue: { url, events: of(new NavigationEnd(1, url, url)), navigate },
        },
        { provide: ConversationInventoryStore, useValue: { conversations } },
        { provide: OrganizationMemberDirectoryStore, useValue: { identities, load: vi.fn() } },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganization: signal({ id: 'org-1' }) },
        },
        {
          provide: MessagingService,
          useValue: {
            listPinnedMessages: vi.fn(() => collection([])),
            listAttachments: vi.fn(() => collection([])),
            listParticipants: vi.fn(() => collection([])),
            getConversationActivity: vi.fn(() =>
              collection([
                { bucket: '2026-07-20', count: 0 },
                { bucket: '2026-07-21', count: 4 },
              ]),
            ),
            listConversationLinks,
            getPresence: vi.fn(() => collection([])),
          },
        },
      ],
    });
  });

  /**
   * Neighbouring threads are derived from the inventory the panel already
   * holds — there is no "related conversations" endpoint, and every fact needed
   * is on the rows the sidebar renders.
   */
  describe('linked threads', () => {
    it('lists the parent, the sub-channels, the siblings and the same-record threads', () => {
      conversations.set([
        conversation({ id: 'c1', name: 'Site A', parentConversationId: 'p1', subject: null }),
        conversation({ id: 'p1', name: 'Parent' }),
        conversation({ id: 'k1', name: 'Child', parentConversationId: 'c1' }),
        conversation({ id: 's1', name: 'Sibling', parentConversationId: 'p1' }),
        conversation({ id: 'x1', name: 'Unrelated' }),
      ]);

      render();

      expect(all('details-linked-thread').map((row) => row.textContent?.trim())).toHaveLength(3);
      expect(at('details-linked-thread')?.textContent).toContain('Parent');
    });

    it('links the threads bound to the same record', () => {
      conversations.set([
        conversation({
          id: 'c1',
          isChannel: false,
          subjectType: 'facility',
          subject: '/api/facilities/f-1',
          subjectLabel: 'Tour Nord',
        }),
        conversation({
          id: 'c2',
          isChannel: false,
          subjectType: 'facility',
          subject: '/api/facilities/f-1',
          subjectLabel: 'Tour Nord — suivi',
        }),
        conversation({ id: 'c3', isChannel: false, subjectType: 'facility' }),
      ]);

      render();

      const rows: readonly HTMLElement[] = all('details-linked-thread');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.textContent).toContain('Tour Nord — suivi');
    });

    // `subject` is omitted from the payload when null, so a `!== null` guard
    // would match every subject-less thread against every other one.
    it('does not link two subject-less conversations to each other', () => {
      conversations.set([
        conversation({ id: 'c1', name: 'One' }),
        conversation({ id: 'c2', name: 'Two' }),
      ]);

      render();

      expect(all('details-linked-thread')).toHaveLength(0);
    });

    it('labels a direct thread with its counterpart, resolved through the directory', () => {
      identities.set(
        new Map([
          ['m-9', { id: 'm-9', displayName: 'Alice Martin', initials: 'AM', avatarUrl: null }],
        ]),
      );
      conversations.set([
        conversation({ id: 'c1', name: 'Site A', parentConversationId: 'p1' }),
        conversation({
          id: 'dm-1',
          isChannel: false,
          subjectType: 'direct',
          parentConversationId: 'p1',
          counterpartMember: '/api/organizations/org-1/members/m-9',
        }),
        conversation({ id: 'p1', name: 'Parent' }),
      ]);

      render();

      expect(
        all('details-linked-thread').some((row) => row.textContent?.includes('Alice Martin')),
      ).toBe(true);
    });

    it('shows the unread count of a linked thread', () => {
      conversations.set([
        conversation({ id: 'c1', name: 'Site A' }),
        conversation({ id: 'k1', name: 'Child', parentConversationId: 'c1', unreadCount: 3 }),
      ]);

      render();

      expect(at('details-linked-thread-unread')?.textContent?.trim()).toBe('3');
    });

    it('switches conversation through the query parameter alone', () => {
      conversations.set([
        conversation({ id: 'c1', name: 'Site A' }),
        conversation({ id: 'k1', name: 'Child', parentConversationId: 'c1' }),
      ]);

      render();
      at('details-linked-thread')?.click();

      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { conversation: 'k1' },
        queryParamsHandling: 'merge',
      });
    });
  });

  describe('links tab', () => {
    it('renders the URL and its age, newest first as the API orders them', () => {
      listConversationLinks.mockImplementation(() =>
        collection([
          { id: 'l1', url: 'https://example.com/a', createdAt: new Date().toISOString() },
          { id: 'l2', url: 'https://example.com/b', createdAt: '2020-01-01T00:00:00Z' },
        ]),
      );

      render();
      openTab('links');

      const rows: readonly HTMLElement[] = all('details-link');
      expect(rows).toHaveLength(2);
      expect(rows[0]?.getAttribute('href')).toBe('https://example.com/a');
      expect(rows[0]?.textContent).toContain('Just now');
    });

    it('offers an empty state when the thread holds no link', () => {
      render();
      openTab('links');

      expect(all('details-link')).toHaveLength(0);
      expect(
        (
          fixture.debugElement.query(By.css('[data-testid="conversation-details-panel"]'))
            .nativeElement as HTMLElement
        ).textContent,
      ).toContain('No links in this thread yet.');
    });

    it('offers load more only while pages remain', () => {
      listConversationLinks.mockImplementation(() =>
        collection(
          [{ id: 'l1', url: 'https://example.com/a', createdAt: '2026-07-01T00:00:00Z' }],
          2,
        ),
      );

      render();
      openTab('links');

      expect(at('details-links-more')).not.toBeNull();

      at('details-links-more')?.click();
      fixture.detectChanges();

      expect(listConversationLinks).toHaveBeenLastCalledWith('c1', 2);
    });
  });

  it('shows the activity heatmap on the info tab', () => {
    render();

    expect(all('activity-cell')).toHaveLength(2);
  });
});

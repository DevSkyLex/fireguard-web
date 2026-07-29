import { signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { type CallState, idleCallState, successCallState } from '@core/request-state';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import { DirectConversationsStore } from '@features/organization/features/collaboration/state';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { MEMBER_DIRECTORY_PORT, ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { CollaborationDirectNav } from '../collaboration-direct-nav.component';

function conversation(overrides: Partial<ConversationOutput> = {}): ConversationOutput {
  return {
    '@id': '/.well-known/genid/x',
    '@type': 'ConversationOutput',
    id: 'dc-1',
    organization: '/api/organizations/org-1',
    subjectType: 'direct',
    visibility: 'participants',
    messagesCount: 0,
    isArchived: false,
    unreadCount: 3,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    isChannel: false,
    isFavorite: false,
    counterpartMember: '/api/organizations/org-1/members/member-9',
    ...overrides,
  };
}

function member(overrides: Partial<MemberDirectoryEntry> = {}): MemberDirectoryEntry {
  return {
    memberId: 'member-9',
    displayName: 'Ella Uzer',
    roleNames: [],
    isActive: true,
    ...overrides,
  };
}

describe('CollaborationDirectNav', () => {
  const rows: WritableSignal<readonly ConversationOutput[]> = signal([]);
  const openCallState: WritableSignal<CallState<ConversationOutput>> = signal(idleCallState());
  const isAvailable: WritableSignal<boolean> = signal(true);
  const directoryById: WritableSignal<ReadonlyMap<string, MemberDirectoryEntry>> = signal(
    new Map(),
  );
  const open = vi.fn();
  const ensureLoaded = vi.fn();
  const directoryEnsureLoaded = vi.fn();

  const store = {
    rows: rows.asReadonly(),
    isLoading: signal(false).asReadonly(),
    isOpening: signal(false).asReadonly(),
    openCallState: openCallState.asReadonly(),
    ensureLoaded,
    open,
  };

  const directory = {
    byId: directoryById.asReadonly(),
    isAvailable: isAvailable.asReadonly(),
    isLoading: signal(false).asReadonly(),
    ensureLoaded: directoryEnsureLoaded,
    displayNameFor: (iri: string): string =>
      iri.endsWith('member-9') ? 'Ella Uzer' : iri.slice(iri.lastIndexOf('/') + 1),
  };

  function build(): ComponentFixture<CollaborationDirectNav> {
    TestBed.configureTestingModule({
      imports: [CollaborationDirectNav],
      providers: [
        provideRouter([]),
        { provide: DirectConversationsStore, useValue: store },
        { provide: MEMBER_DIRECTORY_PORT, useValue: directory },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: signal('org-1').asReadonly() },
        },
      ],
    });

    const fixture = TestBed.createComponent(CollaborationDirectNav);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    rows.set([]);
    openCallState.set(idleCallState());
    isAvailable.set(true);
    directoryById.set(new Map([['member-9', member()]]));
    open.mockReset();
    ensureLoaded.mockReset();
    directoryEnsureLoaded.mockReset();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should ensure the list and directory are loaded for the organization', () => {
    build();

    expect(ensureLoaded).toHaveBeenCalledWith('org-1');
    expect(directoryEnsureLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should render a row per conversation with the resolved counterpart name', () => {
    rows.set([conversation()]);
    const fixture = build();

    const link: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="direct-nav-row"]',
    );

    expect(link?.textContent).toContain('Ella Uzer');
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/direct/dc-1');
  });

  it('should hide the new-message picker when the directory is unreadable', () => {
    isAvailable.set(false);
    const fixture = build();

    expect(fixture.nativeElement.querySelector('[data-testid="direct-nav-new"]')).toBeFalsy();
  });

  it('should reveal the member picker when opened', () => {
    const fixture = build();

    expect(fixture.nativeElement.querySelector('[data-testid="direct-nav-picker"]')).toBeFalsy();

    fixture.nativeElement.querySelector('[data-testid="direct-nav-new"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="direct-nav-picker"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="direct-nav-picker-member"]'),
    ).toBeTruthy();
  });

  it('should open a conversation with the picked member', () => {
    const fixture = build();

    fixture.nativeElement.querySelector('[data-testid="direct-nav-new"]').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="direct-nav-picker-member"]').click();

    expect(open).toHaveBeenCalledWith({ organization: 'org-1', memberId: 'member-9' });
  });

  it('should navigate once the store reports the conversation open', () => {
    const fixture = build();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    openCallState.set(successCallState(conversation({ id: 'dc-42' })));
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/organizations/org-1/direct', 'dc-42']);
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { ChannelParticipantsSheet } from '../channel-participants-sheet.component';
import type { ChannelParticipantView } from '../models';

function participant(overrides: Partial<ChannelParticipantView> = {}): ChannelParticipantView {
  return {
    memberId: 'member-1',
    displayName: 'Amélie Rousseau',
    isResolved: true,
    source: 'manual',
    ...overrides,
  };
}

function candidate(overrides: Partial<MemberDirectoryEntry> = {}): MemberDirectoryEntry {
  return {
    memberId: 'member-9',
    displayName: 'Baptiste Morel',
    roleNames: [],
    isActive: true,
    ...overrides,
  };
}

const panel = (): HTMLElement | null =>
  document.querySelector('[data-testid="channel-participants-sheet"]');

const pressEscape = (): void => {
  panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('ChannelParticipantsSheet', () => {
  let fixture: ComponentFixture<ChannelParticipantsSheet>;
  let added: string[];
  let removed: string[];
  let visibility: boolean[];

  async function open(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChannelParticipantsSheet);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    added = [];
    removed = [];
    visibility = [];
    fixture.componentInstance.added.subscribe((id) => added.push(id));
    fixture.componentInstance.removed.subscribe((id) => removed.push(id));
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing until the page opens it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(ChannelParticipantsSheet);
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('should draw placeholder rows while the roster is loading', async () => {
    await open();
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(panel()?.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(panel()?.querySelector('[data-testid="channel-participants-list"]')).toBeNull();
  });

  it('should show an empty state for a channel with no participants', async () => {
    await open();

    expect(panel()?.textContent).toContain('No participants');
  });

  it('should carry a description naming the sheet’s purpose', async () => {
    await open();

    expect(panel()?.textContent).toContain('See who');
  });

  it('should mark an unresolved participant distinctly, never as a raw id', async () => {
    await open();
    fixture.componentRef.setInput('participants', [
      participant({ memberId: 'member-2', displayName: 'Unknown member', isResolved: false }),
    ]);
    await fixture.whenStable();

    const name = panel()?.querySelector(
      '[data-testid="channel-participants-list"] .font-medium.text-muted-foreground',
    );
    expect(name?.textContent?.trim()).toBe('Unknown member');
  });

  it('should withhold every add/remove control from a reader without canManage', async () => {
    await open();
    fixture.componentRef.setInput('participants', [participant()]);
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();

    expect(panel()?.querySelector('[data-testid="channel-participant-remove"]')).toBeNull();
    expect(panel()?.querySelector('[data-testid="channel-participants-search"]')).toBeNull();
  });

  it('should ask once more before removing, then emit on confirm', async () => {
    await open();
    fixture.componentRef.setInput('participants', [participant()]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    panel()
      ?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-remove"]')
      ?.click();
    await fixture.whenStable();
    expect(removed).toEqual([]);
    expect(
      panel()?.querySelector('[data-testid="channel-participant-confirm-remove"]'),
    ).not.toBeNull();

    panel()
      ?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-confirm-remove"]')
      ?.click();
    await fixture.whenStable();

    expect(removed).toEqual(['member-1']);
  });

  it('should drop the pending removal on Cancel without emitting', async () => {
    await open();
    fixture.componentRef.setInput('participants', [participant()]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    panel()
      ?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-remove"]')
      ?.click();
    await fixture.whenStable();

    const cancel = Array.from(panel()?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Cancel',
    );
    cancel?.click();
    await fixture.whenStable();

    expect(removed).toEqual([]);
    expect(panel()?.querySelector('[data-testid="channel-participant-confirm-remove"]')).toBeNull();
  });

  it('should emit the picked candidate and clear the search', async () => {
    await open();
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('candidates', [candidate()]);
    await fixture.whenStable();

    const search = panel()?.querySelector<HTMLInputElement>(
      '[data-testid="channel-participants-search"]',
    );
    if (search) {
      search.value = 'Bapt';
      search.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    panel()
      ?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-candidate"]')
      ?.click();
    await fixture.whenStable();

    expect(added).toEqual(['member-9']);
    expect(search?.value).toBe('');
  });

  it('should filter candidates case-insensitively as the search narrows', async () => {
    await open();
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('candidates', [
      candidate({ memberId: 'member-9', displayName: 'Baptiste Morel' }),
      candidate({ memberId: 'member-10', displayName: 'Chloé Dubois' }),
    ]);
    await fixture.whenStable();

    const search = panel()?.querySelector<HTMLInputElement>(
      '[data-testid="channel-participants-search"]',
    );
    if (search) {
      search.value = 'chloé';
      search.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    const rows = panel()?.querySelectorAll('[data-testid="channel-participant-candidate"]');
    expect(rows).toHaveLength(1);
    expect(rows?.[0].textContent).toContain('Chloé Dubois');
  });

  it('should degrade to "no one left to add" when the directory offers no candidates', async () => {
    await open();
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('candidates', []);
    await fixture.whenStable();

    expect(panel()?.textContent).toContain('No one left to add.');
  });

  it('should lock every control while a request is in flight', async () => {
    await open();
    fixture.componentRef.setInput('participants', [participant()]);
    fixture.componentRef.setInput('candidates', [candidate()]);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      panel()?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-remove"]')
        ?.disabled,
    ).toBe(true);
    expect(
      panel()?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-candidate"]')
        ?.disabled,
    ).toBe(true);
  });

  it('should reset the search and any pending confirmation on dismissal', async () => {
    await open();
    fixture.componentRef.setInput('participants', [participant()]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    panel()
      ?.querySelector<HTMLButtonElement>('[data-testid="channel-participant-remove"]')
      ?.click();
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChannelInfoSheet } from '../channel-info-sheet.component';
import type { PinnedMessageItem } from '../models';

function pinnedItem(overrides: Partial<PinnedMessageItem> = {}): PinnedMessageItem {
  return {
    id: 'message-1',
    authorName: 'Amélie Rousseau',
    createdAt: '2026-01-01T09:00:00+00:00',
    bodyHtml: '<p>Consigne importante.</p>',
    isDeleted: false,
    canUnpin: true,
    ...overrides,
  };
}

const sheet = (): HTMLElement | null =>
  document.querySelector('[data-testid="channel-info-sheet"]');

describe('ChannelInfoSheet', () => {
  let fixture: ComponentFixture<ChannelInfoSheet>;
  let unpins: string[];

  async function open(pinned: readonly PinnedMessageItem[]): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChannelInfoSheet);
    unpins = [];
    fixture.componentInstance.unpinned.subscribe((id: string) => unpins.push(id));
    fixture.componentRef.setInput('channelName', 'Bâtiment Nord');
    fixture.componentRef.setInput('participants', [
      {
        memberId: 'member-1',
        displayName: 'Amélie Rousseau',
        isResolved: true,
        source: 'member',
      },
    ]);
    fixture.componentRef.setInput('pinned', pinned);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should name the channel and its members', async () => {
    await open([]);

    expect(sheet()?.textContent).toContain('Bâtiment Nord');
    expect(sheet()?.textContent).toContain('Amélie Rousseau');
  });

  it('should show an empty state when nothing is pinned', async () => {
    await open([]);

    expect(sheet()?.textContent).toContain('Nothing pinned');
    expect(sheet()?.querySelector('[data-testid="channel-info-pinned"]')).toBeNull();
  });

  it('should list pinned messages and emit an unpin only where allowed', async () => {
    await open([pinnedItem(), pinnedItem({ id: 'message-2', canUnpin: false })]);

    const buttons = sheet()?.querySelectorAll<HTMLButtonElement>(
      '[data-testid="channel-info-unpin"]',
    );

    // The second row's reader neither pinned it nor manages — no control.
    expect(buttons?.length).toBe(1);

    buttons?.[0]?.click();
    await fixture.whenStable();

    expect(unpins).toEqual(['message-1']);
  });

  it('should draw a tombstoned pin as deleted rather than empty', async () => {
    await open([pinnedItem({ isDeleted: true, bodyHtml: '' })]);

    expect(sheet()?.textContent).toContain('This message was deleted');
  });
});

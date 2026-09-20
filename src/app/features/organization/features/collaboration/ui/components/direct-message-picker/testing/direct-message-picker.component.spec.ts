import { computed, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { DirectMessagePicker } from '../direct-message-picker.component';

function member(overrides: Partial<MemberDirectoryEntry> = {}): MemberDirectoryEntry {
  return {
    memberId: 'member-9',
    displayName: 'Amélie Rousseau',
    roleNames: ['Inspector'],
    isActive: true,
    ...overrides,
  };
}

/** The overlay renders into the document, not into the host element. */
function overlay(): HTMLElement | null {
  return document.querySelector('[data-testid="direct-message-picker"]');
}

describe('DirectMessagePicker', () => {
  const mobile = signal(false);
  let fixture: ComponentFixture<DirectMessagePicker>;

  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  afterAll(() => vi.unstubAllGlobals());

  function candidates(): readonly HTMLButtonElement[] {
    return Array.from(
      overlay()?.querySelectorAll<HTMLButtonElement>(
        '[data-testid="new-direct-message-candidate"]',
      ) ?? [],
    );
  }

  async function search(text: string): Promise<void> {
    const field: HTMLInputElement | null =
      overlay()?.querySelector<HTMLInputElement>('[data-testid="new-direct-message-search"]') ??
      null;

    if (field === null) throw new Error('The picker has no search field.');

    field.value = text;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    mobile.set(false);
    TestBed.overrideProvider(INTERACTION_CAPABILITIES_PORT, {
      useValue: {
        isMobileInteractionMode: mobile,
        mode: computed(() => (mobile() ? 'mobile' : 'desktop')),
      },
    });
    fixture = TestBed.createComponent(DirectMessagePicker);
    fixture.componentRef.setInput('members', [
      member(),
      member({ memberId: 'member-8', displayName: 'Bruno Lefèvre' }),
    ]);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should list every candidate it is given', () => {
    expect(candidates()).toHaveLength(2);
  });

  it('should filter candidates by name, ignoring case', async () => {
    await search('  BRUNO  ');

    expect(candidates()).toHaveLength(1);
    expect(candidates()[0].textContent).toContain('Bruno Lefèvre');
  });

  it('should say so when nothing matches', async () => {
    await search('nobody');

    expect(overlay()?.textContent).toContain('No one to message');
  });

  it('should emit the picked member and close', async () => {
    const picked: string[] = [];
    const closed: boolean[] = [];
    fixture.componentInstance.selected.subscribe((id: string) => picked.push(id));
    fixture.componentInstance.visibleChange.subscribe((open: boolean) => closed.push(open));

    candidates()[0].click();
    await fixture.whenStable();

    expect(picked).toEqual(['member-9']);
    expect(closed).toContain(false);
  });

  it('should refuse a second pick while one is being opened', async () => {
    const picked: string[] = [];
    fixture.componentInstance.selected.subscribe((id: string) => picked.push(id));

    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    candidates()[0].click();
    await fixture.whenStable();

    expect(picked).toEqual([]);
  });
  it('searches and selects the same recipient from the mobile drawer', async () => {
    mobile.set(true);
    await fixture.whenStable();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    await search('BRUNO');
    const picked: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => picked.push(id));
    candidates()[0].click();
    await fixture.whenStable();
    expect(picked).toEqual(['member-8']);
  });

  it('keeps pending recipients disabled in the mobile drawer', async () => {
    mobile.set(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    expect(candidates()).toHaveLength(2);
    expect(candidates().every((candidate) => candidate.disabled)).toBe(true);
  });
});

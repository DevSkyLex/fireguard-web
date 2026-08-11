import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ChannelService } from '@features/organization/features/collaboration/data-access';
import type { ChannelParticipantOutput } from '@features/organization/features/collaboration/models';
import {
  ChannelParticipantsStore,
  type ChannelParticipantsStoreType,
} from '../channel-participants.store';

function participant(overrides: Partial<ChannelParticipantOutput> = {}): ChannelParticipantOutput {
  return {
    '@id': '/.well-known/genid/deadbeef',
    '@type': 'ChannelParticipantOutput',
    memberId: 'member-1',
    role: 'member',
    source: 'manual',
    addedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

function collection(
  member: readonly ChannelParticipantOutput[],
): HydraCollection<ChannelParticipantOutput> {
  return {
    '@id': '/api/channels/channel-1/participants',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<ChannelParticipantOutput>;
}

describe('ChannelParticipantsStore', () => {
  let service: {
    listParticipants: ReturnType<typeof vi.fn>;
    addParticipant: ReturnType<typeof vi.fn>;
    removeParticipant: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  function createStore(): ChannelParticipantsStoreType {
    TestBed.configureTestingModule({
      providers: [
        ChannelParticipantsStore,
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: ChannelService, useValue: service },
      ],
    });

    return TestBed.inject(ChannelParticipantsStore);
  }

  beforeEach(() => {
    service = {
      listParticipants: vi.fn(),
      addParticipant: vi.fn(),
      removeParticipant: vi.fn(),
    };
    mockDispatcher = { dispatch: vi.fn() };
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should start idle and empty', () => {
    const store = createStore();

    expect(store.participants()).toHaveLength(0);
    expect(store.isLoading()).toBe(false);
    expect(store.isMutating()).toBe(false);
    expect(store.loadError()).toBeNull();
  });

  it('should load a channel roster', () => {
    service.listParticipants.mockReturnValue(of(collection([participant()])));

    const store = createStore();
    store.load('channel-1');

    expect(service.listParticipants).toHaveBeenCalledWith('channel-1');
    expect(store.participants()).toEqual([participant()]);
    expect(store.isLoading()).toBe(false);
  });

  it('should record a load failure', () => {
    service.listParticipants.mockReturnValue(throwError(() => new Error('offline')));

    const store = createStore();
    store.load('channel-1');

    expect(store.loadError()).not.toBeNull();
    expect(store.participants()).toHaveLength(0);
  });

  it('should re-read the roster after adding a member, since a re-add answers a fabricated row', () => {
    service.listParticipants.mockReturnValueOnce(of(collection([])));
    service.addParticipant.mockReturnValue(of(participant({ memberId: 'member-2' })));
    service.listParticipants.mockReturnValueOnce(
      of(collection([participant({ memberId: 'member-2', role: 'lead' })])),
    );

    const store = createStore();
    store.load('channel-1');
    store.add({ channelId: 'channel-1', input: { memberId: 'member-2' } });

    expect(service.addParticipant).toHaveBeenCalledWith('channel-1', { memberId: 'member-2' });
    expect(service.listParticipants).toHaveBeenCalledTimes(2);
    expect(store.participants()).toEqual([participant({ memberId: 'member-2', role: 'lead' })]);
    expect(store.isMutating()).toBe(false);
  });

  it('should record a mutation error and dispatch mutationFailed when adding fails', () => {
    service.addParticipant.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.add({ channelId: 'channel-1', input: { memberId: 'member-2' } });

    expect(store.isMutating()).toBe(false);
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Channel Participants Store] mutationFailed' }),
    );
  });

  it('should drop the removed member from the loaded roster locally, since a 204 carries no body', () => {
    service.listParticipants.mockReturnValue(
      of(collection([participant(), participant({ memberId: 'member-2' })])),
    );
    service.removeParticipant.mockReturnValue(of(undefined));

    const store = createStore();
    store.load('channel-1');
    store.remove({ channelId: 'channel-1', memberId: 'member-1' });

    expect(service.removeParticipant).toHaveBeenCalledWith('channel-1', 'member-1');
    expect(store.participants().map((row) => row.memberId)).toEqual(['member-2']);
    expect(store.isMutating()).toBe(false);
  });

  it('should record a mutation error and dispatch mutationFailed when removing fails, without touching the roster', () => {
    service.listParticipants.mockReturnValue(of(collection([participant()])));
    service.removeParticipant.mockReturnValue(throwError(() => new Error('rejected')));

    const store = createStore();
    store.load('channel-1');
    store.remove({ channelId: 'channel-1', memberId: 'member-1' });

    expect(store.participants()).toHaveLength(1);
    expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Channel Participants Store] mutationFailed' }),
    );
  });

  it('should empty the roster on reset so another channel can be loaded into it', () => {
    service.listParticipants.mockReturnValue(of(collection([participant()])));

    const store = createStore();
    store.load('channel-1');
    expect(store.participants()).toHaveLength(1);

    store.reset();

    // The router reuses the sheet's host page, so nothing else clears this.
    expect(store.participants()).toHaveLength(0);
    expect(store.isLoading()).toBe(false);
    expect(store.isMutating()).toBe(false);
    expect(store.loadError()).toBeNull();
  });
});

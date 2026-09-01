import type { ScenePickCandidate } from '../../../models/scene-pick-candidate.interface';
import { pickTarget } from '../pick-target.utils';

describe('pickTarget', () => {
  it('returns null for an empty candidate list', () => {
    expect(pickTarget([], null)).toBeNull();
  });

  it('picks the nearest room when only rooms are hit', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'room', facilityId: 'room-far', floorId: 'floor-1' }, distance: 5 },
      { userData: { kind: 'room', facilityId: 'room-near', floorId: 'floor-1' }, distance: 2 },
    ];

    expect(pickTarget(candidates, null)).toEqual({
      kind: 'room',
      facilityId: 'room-near',
      floorId: 'floor-1',
    });
  });

  it('prefers a farther room over a nearer floor slab', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'floor-slab', floorId: 'floor-1' }, distance: 1 },
      { userData: { kind: 'room', facilityId: 'room-1', floorId: 'floor-1' }, distance: 4 },
    ];

    expect(pickTarget(candidates, null)).toEqual({
      kind: 'room',
      facilityId: 'room-1',
      floorId: 'floor-1',
    });
  });

  it('falls back to the nearest floor slab when no room was hit', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'floor-slab', floorId: 'floor-1' }, distance: 3 },
      { userData: { kind: 'floor-slab', floorId: 'floor-2' }, distance: 1 },
    ];

    expect(pickTarget(candidates, null)).toEqual({ kind: 'floor-slab', floorId: 'floor-2' });
  });

  it('never returns an edges or floor-placeholder hit', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'floor-edges', floorId: 'floor-1' }, distance: 0.1 },
      { userData: { kind: 'floor-placeholder', floorId: 'floor-1' }, distance: 0.2 },
    ];

    expect(pickTarget(candidates, null)).toBeNull();
  });

  it('excludes candidates outside the isolated floor', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'room', facilityId: 'room-1', floorId: 'floor-1' }, distance: 1 },
      { userData: { kind: 'room', facilityId: 'room-2', floorId: 'floor-2' }, distance: 0.5 },
    ];

    expect(pickTarget(candidates, 'floor-1')).toEqual({
      kind: 'room',
      facilityId: 'room-1',
      floorId: 'floor-1',
    });
  });

  it('returns null when everything eligible belongs to a different, isolated floor', () => {
    const candidates: ReadonlyArray<ScenePickCandidate> = [
      { userData: { kind: 'room', facilityId: 'room-1', floorId: 'floor-2' }, distance: 1 },
    ];

    expect(pickTarget(candidates, 'floor-1')).toBeNull();
  });
});

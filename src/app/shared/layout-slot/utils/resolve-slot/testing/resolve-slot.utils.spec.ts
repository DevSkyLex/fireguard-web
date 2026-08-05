import { Component, signal, type Type, type WritableSignal } from '@angular/core';
import type { ExclusiveSlotContribution, SlotContribution } from '../../../models';
import { resolveExclusiveSlot, sortSlotContributions } from '../resolve-slot.utils';

@Component({ selector: 'app-stub', template: '' })
class Stub {}

function additive(id: string, order: number): SlotContribution {
  return { id, order, component: Stub as Type<unknown> };
}

function exclusive(id: string, priority: number, active: boolean): ExclusiveSlotContribution {
  return { id, priority, component: Stub as Type<unknown>, active: signal(active) };
}

describe('sortSlotContributions', () => {
  it('orders contributions by ascending order', () => {
    const sorted = sortSlotContributions([additive('c', 30), additive('a', 10), additive('b', 20)]);

    expect(sorted.map((contribution) => contribution.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps registration order for equal order values', () => {
    const sorted = sortSlotContributions([additive('first', 10), additive('second', 10)]);

    expect(sorted.map((contribution) => contribution.id)).toEqual(['first', 'second']);
  });

  it('does not mutate the source array', () => {
    const contributions = [additive('b', 20), additive('a', 10)];

    sortSlotContributions(contributions);

    expect(contributions.map((contribution) => contribution.id)).toEqual(['b', 'a']);
  });
});

describe('resolveExclusiveSlot', () => {
  it('returns null when nothing is contributed', () => {
    expect(resolveExclusiveSlot([])).toBeNull();
  });

  it('returns null when no contribution is active', () => {
    expect(resolveExclusiveSlot([exclusive('a', 10, false), exclusive('b', 90, false)])).toBeNull();
  });

  it('returns the highest priority active contribution', () => {
    const winner = resolveExclusiveSlot([
      exclusive('low', 10, true),
      exclusive('high', 90, true),
      exclusive('higher-but-inactive', 99, false),
    ]);

    expect(winner?.id).toBe('high');
  });

  it('gives ties to the earliest registration', () => {
    const winner = resolveExclusiveSlot([
      exclusive('first', 50, true),
      exclusive('second', 50, true),
    ]);

    expect(winner?.id).toBe('first');
  });

  it('hands the slot over when a higher priority contribution activates', () => {
    const active: WritableSignal<boolean> = signal(false);
    const contributions: ExclusiveSlotContribution[] = [
      exclusive('incumbent', 10, true),
      { id: 'challenger', priority: 90, component: Stub as Type<unknown>, active },
    ];

    expect(resolveExclusiveSlot(contributions)?.id).toBe('incumbent');

    active.set(true);

    expect(resolveExclusiveSlot(contributions)?.id).toBe('challenger');
  });
});

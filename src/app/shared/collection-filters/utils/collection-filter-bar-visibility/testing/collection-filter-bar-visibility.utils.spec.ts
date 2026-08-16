import { signal, type WritableSignal } from '@angular/core';
import { initialCollectionFilterBarVisibility } from '../collection-filter-bar-visibility.utils';

describe('initialCollectionFilterBarVisibility', () => {
  it('defaults to collapsed when no filter is active at creation', () => {
    const hasActiveFilters: WritableSignal<boolean> = signal(false);

    expect(initialCollectionFilterBarVisibility(hasActiveFilters)()).toBe(false);
  });

  it('defaults to expanded when a filter is already active at creation — a filtered URL is never silently narrowed', () => {
    const hasActiveFilters: WritableSignal<boolean> = signal(true);

    expect(initialCollectionFilterBarVisibility(hasActiveFilters)()).toBe(true);
  });

  it('stays open once the operator opens it manually, even after every filter is cleared', () => {
    const hasActiveFilters: WritableSignal<boolean> = signal(false);
    const visible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(hasActiveFilters);

    visible.set(true);
    hasActiveFilters.set(true);
    hasActiveFilters.set(false);

    expect(visible()).toBe(true);
  });

  it('does not reopen when filters are cleared after the operator collapsed it', () => {
    const hasActiveFilters: WritableSignal<boolean> = signal(true);
    const visible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(hasActiveFilters);
    expect(visible()).toBe(true);

    visible.set(false);
    hasActiveFilters.set(false);
    hasActiveFilters.set(true);

    expect(visible()).toBe(false);
  });
});

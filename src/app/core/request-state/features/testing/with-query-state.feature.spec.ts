import { computed, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { expectTypeOf } from 'vitest';
import type { StoreError } from '../../models';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
} from '../../utils';
import { withQueryState } from '../with-query-state.feature';

/**
 * Type QueryResult
 * @type QueryResult
 * @description Discriminated payload exercising nullable generic query composition.
 */
type QueryResult = { kind: 'record'; label: string } | { kind: 'empty'; reason: string };

/**
 * Function createQueryStore
 * @description Composes the query feature with typed commands that own its private state.
 * @template TData - The successful query payload.
 * @returns A store constructor for exercising the public query projections.
 */
function createQueryStore<TData>() {
  return signalStore(
    withQueryState<TData>(),
    withState({ scope: 'initial' }),
    withComputed(({ queryData }) => ({
      hasData: computed(() => queryData() !== null),
    })),
    withMethods((store) => {
      /**
       * Function pending
       * @function pending
       * @description Starts a query while retaining the previous payload.
       * @returns {void}
       */
      function pending(): void {
        patchState(store, setPendingQuery());
      }
      /**
       * Function succeed
       * @function succeed
       * @description Completes a query with a typed payload.
       * @param {TData} data - The successful payload.
       * @returns {void}
       */
      function succeed(data: TData): void {
        patchState(store, setSuccessQuery(data));
      }
      /**
       * Function fail
       * @function fail
       * @description Reports a normalized query error without clearing cached data.
       * @param {StoreError} error - The normalized error.
       * @returns {void}
       */
      function fail(error: StoreError): void {
        patchState(store, setErrorQuery(error));
      }
      /**
       * Function reset
       * @function reset
       * @description Clears query state while retaining unrelated composed state.
       * @returns {void}
       */
      function reset(): void {
        patchState(store, resetQuery());
      }
      /**
       * Function setScope
       * @function setScope
       * @description Updates state contributed by the consuming store.
       * @param {string} scope - The current consumer scope.
       * @returns {void}
       */
      function setScope(scope: string): void {
        patchState(store, { scope });
      }
      return { pending, succeed, fail, reset, setScope };
    }),
  );
}

const QueryStore = createQueryStore<QueryResult>();

describe('withQueryState', () => {
  let store: InstanceType<typeof QueryStore>;
  let label: Signal<string | null>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [QueryStore] });
    store = TestBed.inject(QueryStore);
    label = computed(() => {
      const result = store.queryData();
      return result?.kind === 'record' ? result.label : null;
    });
  });

  it('exposes plain nullable signals when composed with additional state and computed members', () => {
    expectTypeOf(store.queryData).toEqualTypeOf<Signal<QueryResult | null>>();
    expectTypeOf(store.queryError).toEqualTypeOf<Signal<StoreError | null>>();
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryHasError()).toBe(false);
    expect(store.scope()).toBe('initial');
    expect(store.hasData()).toBe(false);
    expect(label()).toBeNull();
  });

  it('transitions from an empty pending query to a successful payload', () => {
    store.pending();
    expect(store.isQueryLoading()).toBe(true);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryData()).toBeNull();

    store.succeed({ kind: 'record', label: 'First result' });
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.queryHasError()).toBe(false);
    expect(store.queryData()).toEqual({ kind: 'record', label: 'First result' });
    expect(store.hasData()).toBe(true);
    expect(label()).toBe('First result');
  });

  it('preserves loaded data during refresh and failure, then clears the error on retry', () => {
    const data: QueryResult = { kind: 'record', label: 'Cached result' };
    const error = toStoreError(new Error('Refresh failed'));
    store.succeed(data);
    store.pending();
    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toEqual(data);

    store.fail(error);
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()).toEqual(error);
    expect(store.queryData()).toEqual(data);
    expect(label()).toBe('Cached result');

    store.pending();
    expect(store.queryError()).toBeNull();
    expect(store.queryHasError()).toBe(false);
    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toEqual(data);

    store.succeed({ kind: 'record', label: 'Refreshed' });
    expect(label()).toBe('Refreshed');
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.queryError()).toBeNull();
  });

  it('reports an initial failure without fabricating query data', () => {
    const error = toStoreError(new Error('Initial load failed'));
    store.pending();
    store.fail(error);
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toEqual(error);
    expect(store.queryHasError()).toBe(true);
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
  });

  it('recomputes consumers across union members and resets data and errors to null', () => {
    store.succeed({ kind: 'record', label: 'Visible' });
    expect(label()).toBe('Visible');

    store.succeed({ kind: 'empty', reason: 'No matches' });
    expect(store.queryData()).toEqual({ kind: 'empty', reason: 'No matches' });
    expect(label()).toBeNull();

    store.fail(toStoreError(new Error('Failed')));
    store.setScope('changed');
    store.reset();
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.queryHasError()).toBe(false);
    expect(store.scope()).toBe('changed');
    expect(store.hasData()).toBe(false);

    store.succeed({ kind: 'record', label: 'After reset' });
    expect(label()).toBe('After reset');
  });

  it('preserves array and nullable scalar payload contracts', () => {
    const ArrayStore = createQueryStore<readonly string[]>();
    const ScalarStore = createQueryStore<string | null>();
    const arrays = TestBed.runInInjectionContext(() => new ArrayStore());
    const scalar = TestBed.runInInjectionContext(() => new ScalarStore());

    expectTypeOf(arrays.queryData).toEqualTypeOf<Signal<readonly string[] | null>>();
    expectTypeOf(scalar.queryData).toEqualTypeOf<Signal<string | null>>();
    arrays.succeed(['first', 'second']);
    scalar.succeed('ready');
    expect(arrays.queryData()).toEqual(['first', 'second']);
    expect(scalar.queryData()).toBe('ready');

    scalar.succeed(null);
    expect(scalar.queryData()).toBeNull();
    expect(scalar.isQueryLoaded()).toBe(true);
  });
});

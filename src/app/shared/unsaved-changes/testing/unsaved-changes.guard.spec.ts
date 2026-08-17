import type { GuardResult, MaybeAsync } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import type { UnsavedChangesAware } from '../models/unsaved-changes-aware.interface';
import { unsavedChangesGuard } from '../unsaved-changes.guard';

async function resolveGuardResult(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  if (result instanceof Promise) {
    return result;
  }

  if (isObservable(result)) {
    return firstValueFrom(result);
  }

  return result;
}

describe('unsavedChangesGuard', () => {
  it('should allow deactivation without prompting when there is nothing unsaved', async () => {
    const confirmDeactivation = vi.fn();
    const component: UnsavedChangesAware = {
      hasUnsavedChanges: (): boolean => false,
      confirmDeactivation,
    };

    const result = await resolveGuardResult(
      unsavedChangesGuard(component, {} as never, {} as never, {} as never),
    );

    expect(result).toBe(true);
    expect(confirmDeactivation).not.toHaveBeenCalled();
  });

  it('should defer to the component confirmation flow when there are unsaved changes', async () => {
    const component: UnsavedChangesAware = {
      hasUnsavedChanges: (): boolean => true,
      confirmDeactivation: (): ReturnType<UnsavedChangesAware['confirmDeactivation']> => of(true),
    };

    const result = await resolveGuardResult(
      unsavedChangesGuard(component, {} as never, {} as never, {} as never),
    );

    expect(result).toBe(true);
  });

  it('should block deactivation when the component confirmation resolves false', async () => {
    const component: UnsavedChangesAware = {
      hasUnsavedChanges: (): boolean => true,
      confirmDeactivation: (): ReturnType<UnsavedChangesAware['confirmDeactivation']> =>
        Promise.resolve(false),
    };

    const result = await resolveGuardResult(
      unsavedChangesGuard(component, {} as never, {} as never, {} as never),
    );

    expect(result).toBe(false);
  });
});

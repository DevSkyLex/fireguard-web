import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { StoreError } from '@core/state/request-state';
import { ACCOUNT_PERMISSION } from '@features/account/models';
import { UserStore } from '@features/account/state';
import { UserPermissionService } from '../user-permission.service';

describe('UserPermissionService', () => {
  const permissions = signal<ReadonlyArray<string>>([
    ACCOUNT_PERMISSION.PROFILE_READ,
    ACCOUNT_PERMISSION.SESSIONS_READ,
  ]);
  const roles = signal<ReadonlyArray<string>>(['ROLE_USER']);
  const isLoading = signal<boolean>(false);
  const loadError = signal<StoreError | null>(null);
  const reload = vi.fn();

  let service: UserPermissionService;

  beforeEach(() => {
    permissions.set([ACCOUNT_PERMISSION.PROFILE_READ, ACCOUNT_PERMISSION.SESSIONS_READ]);
    roles.set(['ROLE_USER']);
    isLoading.set(false);
    loadError.set(null);
    reload.mockReset();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserStore,
          useValue: {
            isLoading,
            loadError,
            roles,
            permissions,
            reload,
          },
        },
      ],
    });

    service = TestBed.inject(UserPermissionService);
  });

  it('should expose and check global permissions', () => {
    expect(service.permissions()).toEqual([
      ACCOUNT_PERMISSION.PROFILE_READ,
      ACCOUNT_PERMISSION.SESSIONS_READ,
    ]);
    expect(service.hasPermission(ACCOUNT_PERMISSION.PROFILE_READ)).toBe(true);
    expect(service.hasPermission(ACCOUNT_PERMISSION.SESSIONS_READ)).toBe(true);
    expect(service.hasPermission(ACCOUNT_PERMISSION.USERS_READ)).toBe(false);
  });

  it('should support any/all global permission checks', () => {
    expect(
      service.hasAnyPermission([
        ACCOUNT_PERMISSION.USERS_READ,
        ACCOUNT_PERMISSION.SESSIONS_READ,
      ]),
    ).toBe(true);
    expect(
      service.hasAllPermissions([
        ACCOUNT_PERMISSION.PROFILE_READ,
        ACCOUNT_PERMISSION.SESSIONS_READ,
      ]),
    ).toBe(true);
    expect(
      service.hasAllPermissions([
        ACCOUNT_PERMISSION.PROFILE_READ,
        ACCOUNT_PERMISSION.USERS_READ,
      ]),
    ).toBe(false);
  });

  it('should expose loading and error state from the user store', () => {
    const error: StoreError = {
      error: new Error('Unable to load current user'),
      message: 'Unable to load current user',
      code: 'USER_LOAD_FAILED',
      retryable: false,
      timestamp: Date.now(),
    };

    isLoading.set(true);
    loadError.set(error);

    expect(service.isLoadingPermissions()).toBe(true);
    expect(service.permissionError()).toEqual(error);
  });

  it('should proxy reload to the user store', () => {
    service.reload();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

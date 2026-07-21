import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { AccountPage } from '../account-page.component';

describe('AccountPage', () => {
  const setup = (queryParams: Record<string, string> = {}) => {
    const mockRoute = {
      queryParamMap: of(convertToParamMap(queryParams)),
    };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AccountPage());
    return { component, mockRoute, mockRouter };
  };

  it('should default to the profile tab when no tab query parameter is present', () => {
    const { component } = setup();

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('profile');
  });

  it('should derive the active tab from the tab query parameter', () => {
    const { component } = setup({ tab: 'security' });

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('security');
  });

  it('should fall back to profile for an unknown tab value', () => {
    const { component } = setup({ tab: 'unknown' });

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('profile');
  });

  // The Access tab was renamed to Roles; deep links pointing at the old
  // identifier must keep resolving instead of silently falling back.
  it('should resolve the legacy "access" tab value to the roles tab', () => {
    const { component } = setup({ tab: 'access' });

    expect((component as unknown as { activeTab: () => string }).activeTab()).toBe('roles');
  });

  it('should persist the selected tab in the tab query parameter', () => {
    const { component, mockRouter, mockRoute } = setup();

    (component as unknown as { onTabChange: (value: string) => void }).onTabChange('roles');

    expect(mockRouter.navigate).toHaveBeenCalledWith([], {
      relativeTo: mockRoute,
      queryParams: { tab: 'roles' },
      queryParamsHandling: 'merge',
    });
  });
});

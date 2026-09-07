import { RenderMode, type ServerRoute } from '@angular/ssr';
import { serverRoutes } from '../app.routes.server';

describe('serverRoutes', () => {
  it('keeps onboarding server-rendered before the client wildcard', () => {
    const onboardingIndex: number = serverRoutes.findIndex(
      (route: ServerRoute): boolean => route.path === 'onboarding/**',
    );
    const wildcardIndex: number = serverRoutes.findIndex(
      (route: ServerRoute): boolean => route.path === '**',
    );

    expect(onboardingIndex).toBeGreaterThanOrEqual(0);
    expect(serverRoutes[onboardingIndex]?.renderMode).toBe(RenderMode.Server);
    expect(onboardingIndex).toBeLessThan(wildcardIndex);
  });
});

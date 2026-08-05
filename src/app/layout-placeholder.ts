/*
 * SCAFFOLDING — delete with the error pages and the auth shell's own chrome.
 *
 * What is left here is what no feature owns yet: the `error` route's body, the
 * split shell's showcase column, and the theme toggle both public shells put in
 * their header. A shell route with no child that matches cannot activate at
 * all, so the stand-in keeps those URLs reachable.
 *
 * Neither the dashboard nor the authentication workflow appears here any more:
 * both are wired to real feature routes and contributions in `app.routes.ts`.
 *
 * Nothing here is product code: no feature imports it, and the day the last
 * real page lands, its route replaces the matching entry in `app.routes.ts` and
 * this file loses its final reason to exist.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { ThemeService } from '@core/theme';
import type { AdditiveSlotFeature, ExclusiveSlotFeature } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';

@Component({
  selector: 'app-placeholder-tools',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  template: `<button
    hlmBtn
    variant="ghost"
    size="icon-sm"
    id="placeholder-theme"
    [attr.aria-label]="toggleLabel"
    (click)="toggle()"
  >
    <ng-icon [name]="theme.resolvedTheme() === 'dark' ? 'lucideSun' : 'lucideMoon'" />
  </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderTools {
  protected readonly theme: ThemeService = inject<ThemeService>(ThemeService);
  protected readonly toggleLabel: string = $localize`:@@placeholder.toggleTheme:Toggle theme`;

  protected toggle(): void {
    this.theme.setTheme(this.theme.resolvedTheme() === 'dark' ? 'light' : 'dark');
  }
}

@Component({
  selector: 'app-placeholder-showcase',
  template: `<div class="flex h-full flex-col justify-center p-12">
    <p class="text-3xl font-semibold tracking-tight">Showcase slot</p>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderShowcase {}

@Component({
  selector: 'app-placeholder-form',
  template: `<div class="mx-auto w-full max-w-md rounded-xl border p-6">
    <h1 class="text-xl font-semibold">Sign in</h1>
    <p class="mt-2 text-sm text-muted-foreground">Routed into the shell.</p>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderForm {}

export const withPlaceholderTools = (): AdditiveSlotFeature => ({
  useFactory: () => ({ id: 'tools', order: 10, component: PlaceholderTools }),
});

export const withPlaceholderShowcase = (): ExclusiveSlotFeature => ({
  useFactory: () => ({
    id: 'showcase',
    priority: 10,
    component: PlaceholderShowcase,
    active: signal(true),
  }),
});

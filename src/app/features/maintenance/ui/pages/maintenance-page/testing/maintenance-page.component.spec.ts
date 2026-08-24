import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { MaintenanceStore } from '../../../../state';
import { MaintenancePage } from '../maintenance-page.component';

describe('MaintenancePage', () => {
  let navigate: MockInstance;
  let store: InstanceType<typeof MaintenanceStore>;

  async function createPage(): Promise<ComponentFixture<MaintenancePage>> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), MaintenanceStore],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store = TestBed.inject(MaintenanceStore);
    store.activate();

    const fixture = TestBed.createComponent(MaintenancePage);
    await fixture.whenStable();

    return fixture;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return to the workspace root when the reader retries', async () => {
    const fixture = await createPage();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should lower the maintenance flag before navigating, or the guard sends the reader back', async () => {
    const fixture = await createPage();

    expect(store.isActive()).toBe(true);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(store.isActive()).toBe(false);
  });
});

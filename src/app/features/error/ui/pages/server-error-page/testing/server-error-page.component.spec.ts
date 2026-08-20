import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { ServerErrorPage } from '../server-error-page.component';

describe('ServerErrorPage', () => {
  let navigate: MockInstance;

  async function createPage(): Promise<ComponentFixture<ServerErrorPage>> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ServerErrorPage);
    await fixture.whenStable();

    return fixture;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry the workspace root, re-running the guard that failed', async () => {
    const fixture = await createPage();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});

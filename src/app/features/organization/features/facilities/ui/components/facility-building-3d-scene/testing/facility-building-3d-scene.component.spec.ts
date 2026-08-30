import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemeMode, type ThemePort } from '@core/theme';
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
import { FacilityBuilding3dScene } from '../facility-building-3d-scene.component';

const MODEL: FacilityBuildingModelOutput = {
  buildingId: 'building-1',
  buildingName: 'HQ Tower',
  floors: [
    {
      facilityId: 'floor-1',
      name: 'Ground floor',
      levelIndex: 0,
      status: 'active',
      plan: null,
      outline: null,
      rooms: [],
    },
    {
      facilityId: 'floor-2',
      name: 'First floor',
      levelIndex: 1,
      status: 'active',
      plan: null,
      outline: null,
      rooms: [],
    },
  ],
};

describe('FacilityBuilding3dScene', () => {
  let themePortStub: ThemePort;

  function createFixture(platform: string): ComponentFixture<FacilityBuilding3dScene> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: THEME_PORT, useValue: themePortStub },
      ],
    });

    const fixture = TestBed.createComponent(FacilityBuilding3dScene);
    fixture.componentRef.setInput('model', MODEL);
    return fixture;
  }

  beforeEach(() => {
    themePortStub = {
      theme: signal<ThemeMode>('light'),
      resolvedTheme: signal<'light' | 'dark'>('light'),
      setTheme: vi.fn(),
    };
  });

  describe('server platform', () => {
    it('renders the skeleton and no canvas, without attempting a mount', async () => {
      const fixture = createFixture('server');
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
      expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    });

    it('exposes the building name and floor count through the accessible label', async () => {
      const fixture = createFixture('server');
      await fixture.whenStable();

      const skeleton = fixture.nativeElement.querySelector('hlm-skeleton') as HTMLElement;
      expect(skeleton.getAttribute('aria-label')).toBe('3D view of HQ Tower — 2 floor(s)');
    });
  });

  describe('browser platform', () => {
    it('emits renderingUnavailable and never flips ready when the canvas has no WebGL context', async () => {
      const fixture = createFixture('browser');
      const unavailable = vi.fn();
      fixture.componentInstance.renderingUnavailable.subscribe(unavailable);

      await vi.waitFor(async () => {
        await fixture.whenStable();
        expect(unavailable).toHaveBeenCalled();
      });

      expect(fixture.componentInstance['ready']()).toBe(false);
      expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    });

    it('mounts a canvas carrying the accessible label before rendering fails', async () => {
      const fixture = createFixture('browser');
      await fixture.whenStable();

      const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).not.toBeNull();
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toBe('3D view of HQ Tower — 2 floor(s)');
    });
  });
});

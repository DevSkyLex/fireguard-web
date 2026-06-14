import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MenuItem } from 'primeng/api';
import { ASIDE_SLOT } from '../../../slots/aside';
import { NAVIGATION_SLOT } from '../../../slots/navigation';
import { TOPBAR_SLOT } from '../../../slots/topbar';
import {
  provideDashboardLayoutSlots,
  type DashboardLayoutAsideSlotFeature,
  type DashboardLayoutNavigationSlotFeature,
  type DashboardLayoutTopbarSlotFeature,
} from '../dashboard-layout-slots.provider';

@Component({
  selector: 'app-test-slot-component',
  standalone: true,
  template: '',
})
class TestSlotComponent {}

describe('provideDashboardLayoutSlots', () => {
  it('should aggregate navigation, topbar and aside providers', () => {
    const navigationFeature: DashboardLayoutNavigationSlotFeature = {
      useFactory: () => ({
        id: 'test-navigation',
        order: 10,
        section: signal<MenuItem>({
          id: 'test-navigation',
          label: 'Test navigation',
        }),
      }),
    };
    const topbarFeature: DashboardLayoutTopbarSlotFeature = {
      useFactory: () => ({
        id: 'test-topbar',
        order: 10,
        component: TestSlotComponent,
      }),
    };
    const asideFeature: DashboardLayoutAsideSlotFeature = {
      useFactory: () => ({
        id: 'test-aside',
        priority: 10,
        component: TestSlotComponent,
        active: signal(true),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideDashboardLayoutSlots({
          navigation: [navigationFeature],
          topbar: [topbarFeature],
          aside: [asideFeature],
        }),
      ],
    });

    expect(TestBed.inject(NAVIGATION_SLOT).map((item) => item.id)).toEqual(['test-navigation']);
    expect(TestBed.inject(TOPBAR_SLOT).map((item) => item.id)).toEqual(['test-topbar']);
    expect(TestBed.inject(ASIDE_SLOT).map((item) => item.id)).toEqual(['test-aside']);
  });
});

import { SetupChecklist } from '@features/onboarding/ui/components/setup-checklist';
import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Feature withSetupChecklist
 *
 * @description
 * Registers the {@link SetupChecklist} control into the dashboard topbar slot.
 * The control is a persistent, non-blocking activation entry point: it shows
 * setup progress and resumes the wizard, and self-hides once onboarding is
 * completed or dismissed.
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ topbar: [withSetupChecklist()] })
 * ```
 */
export function withSetupChecklist(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'setup-checklist',
      order: 5,
      component: SetupChecklist,
    }),
  };
}

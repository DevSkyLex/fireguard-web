import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { idleCallState, pendingCallState, successCallState } from '@core/request-state';
import type { PlanningCatalogueState } from '@features/organization/features/interventions/models';
import { InterventionCatalogueStatus } from '../intervention-catalogue-status.component';

/**
 * Function catalogue
 * @function catalogue
 *
 * @description
 * Creates the smallest catalogue state needed by the status component tests.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {PlanningCatalogueState['callState']} callState - Async state to expose.
 * @param {number} loaded - Number of options already available.
 * @param {number} total - Total matching options reported by the source.
 * @returns {PlanningCatalogueState} Catalogue coverage and request state.
 */
function catalogue(
  callState: PlanningCatalogueState['callState'],
  loaded: number = 0,
  total: number = 0,
): PlanningCatalogueState {
  return { page: 0, loaded, total, callState };
}

describe('InterventionCatalogueStatus', () => {
  let fixture: ComponentFixture<InterventionCatalogueStatus>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionCatalogueStatus);
    fixture.componentRef.setInput('kind', 'facilities');
    await fixture.whenStable();
  });

  it('should remove an idle catalogue host from field layout', () => {
    fixture.componentRef.setInput('state', catalogue(idleCallState()));

    expect(host().classList).toContain('hidden');
    expect(host().querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('should keep the host visible while catalogue options are loading', async () => {
    fixture.componentRef.setInput('state', catalogue(pendingCallState()));
    await fixture.whenStable();

    expect(host().classList).not.toContain('hidden');
    expect(host().textContent).toContain('Loading options…');
  });

  it('should keep coverage feedback visible until every option is loaded', async () => {
    fixture.componentRef.setInput('state', catalogue(successCallState(null), 2, 5));
    await fixture.whenStable();

    expect(host().classList).not.toContain('hidden');
    expect(host().textContent).toContain('2 of 5 matching options loaded.');
  });

  it('should hide a fully loaded catalogue host', async () => {
    fixture.componentRef.setInput('state', catalogue(successCallState(null), 5, 5));
    await fixture.whenStable();

    expect(host().classList).toContain('hidden');
  });
});

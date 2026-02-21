import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseApiService } from '../base-api.service';
import type {
  OnboardingOutput,
  StartOnboardingInput,
  OnboardingStepKey,
} from '@core/models/onboarding';

@Injectable({
  providedIn: 'root',
})
export class OnboardingService extends BaseApiService {
  //#region Properties
  private static readonly BASE_PATH: string = '/api/onboarding/organization';

  private static readonly ROLLBACK_ENDPOINT: string = 'rollback';

  private static readonly STEP_ENDPOINT: string = 'steps';

  private static readonly START_ENDPOINT: string = 'start';
  //#endregion

  //#region Public Methods
  public get(): Observable<OnboardingOutput> {
    return this.getOne<OnboardingOutput>(OnboardingService.BASE_PATH);
  }

  public start(input: StartOnboardingInput): Observable<OnboardingOutput> {
    return this.post<StartOnboardingInput, OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.START_ENDPOINT}`,
      input,
    );
  }

  public executeStep(stepKey: OnboardingStepKey): Observable<OnboardingOutput> {
    return this.post<Record<string, never>, OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.STEP_ENDPOINT}/${stepKey}/execute`,
      {},
    );
  }

  public skipStep(stepKey: OnboardingStepKey): Observable<OnboardingOutput> {
    return this.postAction<OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.STEP_ENDPOINT}/${stepKey}/skip`,
    );
  }

  public rollback(): Observable<OnboardingOutput> {
    return this.postAction<OnboardingOutput>(
      `${OnboardingService.BASE_PATH}/${OnboardingService.ROLLBACK_ENDPOINT}`,
    );
  }
  //#endregion
}

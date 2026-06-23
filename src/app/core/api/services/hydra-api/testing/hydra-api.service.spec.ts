import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { HydraApiService } from '../hydra-api.service';

describe('HydraApiService', () => {
  let service: HydraApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HydraApiService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } },
      ],
    });
    service = TestBed.inject(HydraApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});

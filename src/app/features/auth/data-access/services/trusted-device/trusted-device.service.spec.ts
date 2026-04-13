import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideEnv } from '@core/config/environment/env.provider';
import { environment } from '@env/environment';
import { TrustedDeviceService } from './trusted-device.service';

describe('TrustedDeviceService', () => {
  let service: TrustedDeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideEnv(environment),
        TrustedDeviceService,
      ],
    });
    service = TestBed.inject(TrustedDeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

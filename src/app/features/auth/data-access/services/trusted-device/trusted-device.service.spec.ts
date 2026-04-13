import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TrustedDeviceService } from './trusted-device.service';
import { provideEnv } from '@core/config/environment/env.provider';
import { environment } from '@env/environment';

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

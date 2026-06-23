import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { MercureService } from '../mercure.service';

describe('MercureService', () => {
  let service: MercureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } },
      ],
    });
    service = TestBed.inject(MercureService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});

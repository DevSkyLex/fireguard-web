import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { TitleService } from '../title.service';

describe('TitleService', () => {
  let service: TitleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } }],
    });
    service = TestBed.inject(TitleService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '../connectivity.service';

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConnectivityService] });
    service = TestBed.inject(ConnectivityService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});

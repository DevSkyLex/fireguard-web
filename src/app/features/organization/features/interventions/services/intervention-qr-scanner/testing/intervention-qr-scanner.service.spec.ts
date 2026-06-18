import { TestBed } from '@angular/core/testing';
import { InterventionQrScannerService } from '../intervention-qr-scanner.service';

describe('InterventionQrScannerService', () => {
  let service: InterventionQrScannerService;

  beforeEach(() => {
    delete (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
    TestBed.configureTestingModule({ providers: [InterventionQrScannerService] });
    service = TestBed.inject(InterventionQrScannerService);
  });

  it('should report no support when the BarcodeDetector API is unavailable', () => {
    expect(service.isSupported()).toBe(false);
  });

  it('should resolve null when scanning without BarcodeDetector support', async () => {
    const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });

    expect(await service.scan(file)).toBeNull();
  });
});

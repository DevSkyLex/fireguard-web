import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InterventionPhotoCompressorService } from '../intervention-photo-compressor.service';

describe('InterventionPhotoCompressorService', () => {
  it('should return the original file unchanged for a non-image file', async () => {
    TestBed.configureTestingModule({ providers: [InterventionPhotoCompressorService] });
    const service = TestBed.inject(InterventionPhotoCompressorService);
    const file = new File(['note'], 'note.txt', { type: 'text/plain' });

    expect(await service.compress(file)).toBe(file);
  });

  it('should skip compression on the server platform', async () => {
    TestBed.configureTestingModule({
      providers: [InterventionPhotoCompressorService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(InterventionPhotoCompressorService);
    const file = new File(['binary'], 'photo.jpg', { type: 'image/jpeg' });

    expect(await service.compress(file)).toBe(file);
  });
});

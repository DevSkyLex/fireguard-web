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

  describe('prepareAll', () => {
    it('should compress every file when all succeed', async () => {
      TestBed.configureTestingModule({
        providers: [
          InterventionPhotoCompressorService,
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      const service = TestBed.inject(InterventionPhotoCompressorService);
      const files = [
        new File(['a'], 'a.txt', { type: 'text/plain' }),
        new File(['b'], 'b.txt', { type: 'text/plain' }),
      ];

      const result = await service.prepareAll(files);

      expect(result.ready).toEqual(files);
      expect(result.failed).toEqual([]);
    });

    it('should collect the names of files that fail to compress, without dropping the ones that succeed', async () => {
      TestBed.configureTestingModule({ providers: [InterventionPhotoCompressorService] });
      const service = TestBed.inject(InterventionPhotoCompressorService);
      const okFile = new File(['ok'], 'ok.txt', { type: 'text/plain' });
      const failingFile = new File(['bad'], 'bad.jpg', { type: 'image/jpeg' });
      vi.spyOn(service, 'compress').mockImplementation((file: File) =>
        file === failingFile ? Promise.reject(new Error('boom')) : Promise.resolve(file),
      );

      const result = await service.prepareAll([okFile, failingFile]);

      expect(result.ready).toEqual([okFile]);
      expect(result.failed).toEqual(['bad.jpg']);
    });
  });
});

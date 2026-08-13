import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserDownloadService } from '../browser-download.service';

describe('BrowserDownloadService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should click a throwaway anchor pointing at an object URL, then revoke it', () => {
    TestBed.configureTestingModule({ providers: [BrowserDownloadService] });
    const service = TestBed.inject(BrowserDownloadService);
    const blob = new Blob(['file-bytes'], { type: 'application/pdf' });
    const objectUrl = 'blob:http://localhost/mock-object-url';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    service.trigger(blob, 'evidence.pdf');

    expect(anchor.href).toBe(objectUrl);
    expect(anchor.download).toBe('evidence.pdf');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(objectUrl);
  });

  it('should do nothing on the server platform', () => {
    TestBed.configureTestingModule({
      providers: [BrowserDownloadService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(BrowserDownloadService);
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL');

    service.trigger(new Blob(['x']), 'x.txt');

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
  });
});

import { formatFileSize } from '../utils';

describe('formatFileSize', () => {
  it('should render bytes without a decimal', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('should step up to kB, MB and GB', () => {
    expect(formatFileSize(1024)).toBe('1.0 kB');
    expect(formatFileSize(1_482_910)).toBe('1.4 MB');
    expect(formatFileSize(3 * 1024 ** 3)).toBe('3.0 GB');
  });

  it('should not step past GB', () => {
    expect(formatFileSize(5 * 1024 ** 4)).toBe('5120.0 GB');
  });

  it('should treat an absent or nonsensical size as zero', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
  });
});

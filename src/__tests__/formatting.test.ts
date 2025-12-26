import { describe, it, expect } from 'vitest';
import { formatFileSize } from '../util';

describe('formatFileSize', () => {
  it('should format zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('should format bytes under 1 KB', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('should format exactly 1 KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('should round KB values without decimals', () => {
    expect(formatFileSize(7100)).toBe('7 KB');    // 6.93 KB rounded
    expect(formatFileSize(16511)).toBe('16 KB');  // 16.12 KB rounded
    expect(formatFileSize(21000)).toBe('21 KB');  // 20.51 KB rounded
  });

  it('should handle large KB values', () => {
    expect(formatFileSize(165707)).toBe('162 KB'); // 161.82 KB rounded
    expect(formatFileSize(471433)).toBe('460 KB'); // 460.38 KB rounded
  });

  it('should format MB values', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');   // Exactly 1 MB
    expect(formatFileSize(1572864)).toBe('2 MB');   // 1.5 MB rounded up
    expect(formatFileSize(2621440)).toBe('3 MB');   // 2.5 MB rounded up
  });
});

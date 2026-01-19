import { describe, it, expect } from 'vitest';
import {
  isBinaryContent,
  getFileType,
  computeFileHash,
} from '../utils/file-utils.js';

describe('isBinaryContent', () => {
  it('should detect text files by extension', () => {
    expect(isBinaryContent('test.md')).toBe(false);
    expect(isBinaryContent('test.txt')).toBe(false);
    expect(isBinaryContent('test.json')).toBe(false);
    expect(isBinaryContent('test.yaml')).toBe(false);
    expect(isBinaryContent('test.ts')).toBe(false);
    expect(isBinaryContent('test.py')).toBe(false);
  });

  it('should detect binary files by magic bytes', () => {
    // PNG signature
    const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isBinaryContent('image.unknown', pngContent)).toBe(true);

    // JPEG signature
    const jpegContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(isBinaryContent('image.unknown', jpegContent)).toBe(true);

    // ZIP signature
    const zipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    expect(isBinaryContent('archive.unknown', zipContent)).toBe(true);
  });

  it('should detect binary by null bytes', () => {
    const contentWithNull = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
    expect(isBinaryContent('file.unknown', contentWithNull)).toBe(true);
  });

  it('should treat text content as non-binary', () => {
    const textContent = new TextEncoder().encode('Hello, World!');
    expect(isBinaryContent('file.unknown', textContent)).toBe(false);
  });

  it('should prioritize extension for known text extensions', () => {
    // Even with binary-looking content, known text extensions are not binary
    const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(isBinaryContent('file.md', pngContent)).toBe(false);
  });
});

describe('getFileType', () => {
  it('should return directory for directories', () => {
    expect(getFileType('some/path', true)).toBe('directory');
  });

  it('should detect markdown files', () => {
    expect(getFileType('README.md')).toBe('markdown');
    expect(getFileType('doc.markdown')).toBe('markdown');
  });

  it('should detect YAML files', () => {
    expect(getFileType('config.yaml')).toBe('yaml');
    expect(getFileType('config.yml')).toBe('yaml');
  });

  it('should detect text files', () => {
    expect(getFileType('script.ts')).toBe('text');
    expect(getFileType('script.py')).toBe('text');
    expect(getFileType('data.json')).toBe('text');
  });

  it('should detect binary files with content', () => {
    const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(getFileType('image.png', false, pngContent)).toBe('binary');
  });

  it('should default to text for unknown extensions without content', () => {
    expect(getFileType('file.unknown')).toBe('text');
  });
});

describe('computeFileHash', () => {
  it('should compute MD5 hash for content', () => {
    const content = new TextEncoder().encode('Hello, World!');
    const hash = computeFileHash(content);

    // MD5 of "Hello, World!" is 65a8e27d8879283831b664bd8b7f0ad4
    expect(hash).toBe('65a8e27d8879283831b664bd8b7f0ad4');
  });

  it('should return consistent hash for same content', () => {
    const content1 = new TextEncoder().encode('test content');
    const content2 = new TextEncoder().encode('test content');

    expect(computeFileHash(content1)).toBe(computeFileHash(content2));
  });

  it('should return different hash for different content', () => {
    const content1 = new TextEncoder().encode('content 1');
    const content2 = new TextEncoder().encode('content 2');

    expect(computeFileHash(content1)).not.toBe(computeFileHash(content2));
  });

  it('should handle empty content', () => {
    const emptyContent = new Uint8Array([]);
    const hash = computeFileHash(emptyContent);

    // MD5 of empty string is d41d8cd98f00b204e9800998ecf8427e
    expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('should work with Buffer', () => {
    const buffer = Buffer.from('Hello, World!');
    const hash = computeFileHash(buffer);

    expect(hash).toBe('65a8e27d8879283831b664bd8b7f0ad4');
  });
});

/**
 * Zip extractor extended tests to improve coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import JSZip from 'jszip';
import { extractZip, findSkillRoot, isPathSafe } from '../utils/zip-extractor.js';

describe('Zip Extractor Extended Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'zip-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('isPathSafe', () => {
    it('should return true for safe paths', () => {
      expect(isPathSafe('file.txt', '/base')).toBe(true);
      expect(isPathSafe('folder/file.txt', '/base')).toBe(true);
      expect(isPathSafe('a/b/c/file.txt', '/base')).toBe(true);
    });

    it('should return false for path traversal attempts', () => {
      expect(isPathSafe('../file.txt', '/base')).toBe(false);
      expect(isPathSafe('folder/../../../file.txt', '/base')).toBe(false);
      expect(isPathSafe('folder/../../etc/passwd', '/base')).toBe(false);
    });

    it('should return true for path that equals base', () => {
      expect(isPathSafe('', '/base')).toBe(true);
    });
  });

  describe('extractZip - security checks', () => {
    it('should reject zip with too many files', async () => {
      const zip = new JSZip();
      // Add more files than the limit
      for (let i = 0; i < 10; i++) {
        zip.file(`file${i}.txt`, `content ${i}`);
      }
      const zipData = await zip.generateAsync({ type: 'uint8array' });

      const result = await extractZip(zipData, tempDir, 10 * 1024 * 1024, 5); // maxFiles = 5

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('ZIP_BOMB');
      expect(result.error_message).toContain('Too many files');
    });

    it('should detect path traversal in isPathSafe', () => {
      // Test the isPathSafe function directly for path traversal detection
      expect(isPathSafe('../../../etc/passwd', tempDir)).toBe(false);
      expect(isPathSafe('folder/../../../etc/passwd', tempDir)).toBe(false);
    });

    it('should reject zip exceeding size limit', async () => {
      const zip = new JSZip();
      // Create file larger than limit
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      zip.file('large.txt', largeContent);
      const zipData = await zip.generateAsync({ type: 'uint8array' });

      const result = await extractZip(zipData, tempDir, 100); // Very small limit

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('FILE_TOO_LARGE');
    });

    it('should reject zip with suspicious compression ratio', async () => {
      const zip = new JSZip();
      // Create highly compressible content
      const compressibleContent = 'a'.repeat(100000);
      zip.file('compressed.txt', compressibleContent);
      const zipData = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // Set a very low max ratio
      const result = await extractZip(zipData, tempDir, 10 * 1024 * 1024, 1000, 1.1);

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('ZIP_BOMB');
      expect(result.error_message).toContain('compression ratio');
    });

    it('should handle invalid zip data', async () => {
      const invalidData = new Uint8Array([0, 1, 2, 3, 4, 5]);

      const result = await extractZip(invalidData, tempDir);

      expect(result.success).toBe(false);
      // Can be either INVALID_ZIP or EXTRACTION_ERROR depending on how JSZip fails
      expect(['INVALID_ZIP', 'EXTRACTION_ERROR']).toContain(result.error_code);
    });

    it('should skip directories in zip', async () => {
      const zip = new JSZip();
      zip.folder('empty_folder');
      zip.file('file.txt', 'content');
      const zipData = await zip.generateAsync({ type: 'uint8array' });

      const result = await extractZip(zipData, tempDir);

      expect(result.success).toBe(true);
      expect(result.file_count).toBe(1); // Only the file, not the folder
    });

    it('should extract nested files correctly', async () => {
      const zip = new JSZip();
      zip.file('a/b/c/deep.txt', 'deep content');
      zip.file('root.txt', 'root content');
      const zipData = await zip.generateAsync({ type: 'uint8array' });

      const result = await extractZip(zipData, tempDir);

      expect(result.success).toBe(true);
      expect(result.file_count).toBe(2);
    });
  });

  describe('findSkillRoot', () => {
    it('should find SKILL.md in root directory', async () => {
      await writeFile(join(tempDir, 'SKILL.md'), '---\nname: test\n---');

      const result = await findSkillRoot(tempDir);

      expect(result).toBe(tempDir);
    });

    it('should find SKILL.md in single subdirectory', async () => {
      const subDir = join(tempDir, 'skill-package');
      await mkdir(subDir);
      await writeFile(join(subDir, 'SKILL.md'), '---\nname: test\n---');

      const result = await findSkillRoot(tempDir);

      expect(result).toBe(subDir);
    });

    it('should return null when SKILL.md not found', async () => {
      await writeFile(join(tempDir, 'README.md'), 'No skill here');

      const result = await findSkillRoot(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when multiple top-level entries exist', async () => {
      await mkdir(join(tempDir, 'dir1'));
      await mkdir(join(tempDir, 'dir2'));

      const result = await findSkillRoot(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when single entry is a file, not directory', async () => {
      await writeFile(join(tempDir, 'file.txt'), 'content');

      const result = await findSkillRoot(tempDir);

      expect(result).toBeNull();
    });

    it('should return null when subdirectory has no SKILL.md', async () => {
      const subDir = join(tempDir, 'no-skill');
      await mkdir(subDir);
      await writeFile(join(subDir, 'README.md'), 'No skill');

      const result = await findSkillRoot(tempDir);

      expect(result).toBeNull();
    });

    it('should handle non-existent directory gracefully', async () => {
      const result = await findSkillRoot('/nonexistent/path/that/does/not/exist');

      expect(result).toBeNull();
    });
  });
});

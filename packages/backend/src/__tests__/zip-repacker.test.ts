/**
 * Tests for zip-repacker utility.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  repackSkillZip,
  validateRepackRequest,
  type SkillFileWithContent,
} from '../utils/zip-repacker.js';
import type { SkillFile } from '@skills-runtime/shared';

describe('zip-repacker', () => {
  describe('repackSkillZip', () => {
    it('should create a zip with text files', async () => {
      const files: SkillFileWithContent[] = [
        {
          path: 'SKILL.md',
          file_type: 'file',
          size: 100,
          content: '# Original Skill',
        },
        {
          path: 'README.md',
          file_type: 'file',
          size: 50,
          content: '# README',
        },
      ];

      const modifiedContents = new Map<string, string>();

      const zipData = await repackSkillZip(files, modifiedContents);
      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);

      // Verify zip contents
      const zip = await JSZip.loadAsync(zipData);
      const skillMd = await zip.file('SKILL.md')?.async('string');
      expect(skillMd).toBe('# Original Skill');
    });

    it('should use modified content when provided', async () => {
      const files: SkillFileWithContent[] = [
        {
          path: 'SKILL.md',
          file_type: 'file',
          size: 100,
          content: '# Original Skill',
        },
      ];

      const modifiedContents = new Map<string, string>([
        ['SKILL.md', '# Modified Skill'],
      ]);

      const zipData = await repackSkillZip(files, modifiedContents);

      // Verify modified content is used
      const zip = await JSZip.loadAsync(zipData);
      const skillMd = await zip.file('SKILL.md')?.async('string');
      expect(skillMd).toBe('# Modified Skill');
    });

    it('should skip directories', async () => {
      const files: SkillFileWithContent[] = [
        {
          path: 'src',
          file_type: 'directory',
          size: 0,
        },
        {
          path: 'src/index.ts',
          file_type: 'file',
          size: 50,
          content: 'export {}',
        },
      ];

      const modifiedContents = new Map<string, string>();

      const zipData = await repackSkillZip(files, modifiedContents);

      const zip = await JSZip.loadAsync(zipData);
      // Directory should be created implicitly
      const srcIndex = await zip.file('src/index.ts')?.async('string');
      expect(srcIndex).toBe('export {}');
    });

    it('should handle binary content', async () => {
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

      const files: SkillFileWithContent[] = [
        {
          path: 'image.png',
          file_type: 'file',
          size: 4,
          binary_content: binaryData,
        },
      ];

      const modifiedContents = new Map<string, string>();

      const zipData = await repackSkillZip(files, modifiedContents);

      const zip = await JSZip.loadAsync(zipData);
      const imageData = await zip.file('image.png')?.async('uint8array');
      expect(imageData).toEqual(binaryData);
    });

    it('should skip files with no content', async () => {
      const files: SkillFileWithContent[] = [
        {
          path: 'empty.txt',
          file_type: 'file',
          size: 0,
          // No content or binary_content
        },
        {
          path: 'SKILL.md',
          file_type: 'file',
          size: 10,
          content: '# Skill',
        },
      ];

      const modifiedContents = new Map<string, string>();

      const zipData = await repackSkillZip(files, modifiedContents);

      const zip = await JSZip.loadAsync(zipData);
      expect(zip.file('empty.txt')).toBeNull();
      expect(zip.file('SKILL.md')).not.toBeNull();
    });
  });

  describe('validateRepackRequest', () => {
    it('should return empty errors for valid paths', () => {
      const files: SkillFile[] = [
        { path: 'SKILL.md', file_type: 'file', size: 100 },
        { path: 'README.md', file_type: 'file', size: 50 },
      ];

      const modifiedPaths = new Set(['SKILL.md']);

      const errors = validateRepackRequest(files, modifiedPaths);
      expect(errors).toEqual([]);
    });

    it('should return errors for non-existent paths', () => {
      const files: SkillFile[] = [
        { path: 'SKILL.md', file_type: 'file', size: 100 },
      ];

      const modifiedPaths = new Set(['SKILL.md', 'non-existent.txt']);

      const errors = validateRepackRequest(files, modifiedPaths);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('non-existent.txt');
    });

    it('should return multiple errors for multiple invalid paths', () => {
      const files: SkillFile[] = [
        { path: 'SKILL.md', file_type: 'file', size: 100 },
      ];

      const modifiedPaths = new Set(['file1.txt', 'file2.txt']);

      const errors = validateRepackRequest(files, modifiedPaths);
      expect(errors.length).toBe(2);
    });

    it('should handle empty modified paths', () => {
      const files: SkillFile[] = [
        { path: 'SKILL.md', file_type: 'file', size: 100 },
      ];

      const modifiedPaths = new Set<string>();

      const errors = validateRepackRequest(files, modifiedPaths);
      expect(errors).toEqual([]);
    });
  });
});

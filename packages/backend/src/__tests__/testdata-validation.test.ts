import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { extractZip, findSkillRoot, isPathSafe } from '../utils/zip-extractor.js';
import { parseFrontmatter } from '../utils/yaml-parser.js';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

const TESTDATA_DIR = join(process.cwd(), '../../testdata/skills');

describe('isPathSafe', () => {
  it('should allow safe paths', () => {
    expect(isPathSafe('file.txt', '/base')).toBe(true);
    expect(isPathSafe('dir/file.txt', '/base')).toBe(true);
    expect(isPathSafe('dir/subdir/file.txt', '/base')).toBe(true);
  });

  it('should reject path traversal attempts', () => {
    expect(isPathSafe('../file.txt', '/base')).toBe(false);
    expect(isPathSafe('dir/../../../file.txt', '/base')).toBe(false);
    expect(isPathSafe('dir/../../etc/passwd', '/base')).toBe(false);
  });
});

describe('extractZip with valid packages', () => {
  it('should extract brand-guidelines.zip successfully', async () => {
    const zipPath = join(TESTDATA_DIR, 'brand-guidelines.zip');
    const zipData = await readFile(zipPath);
    const tempDir = await mkdtemp(join(tmpdir(), 'test-extract-'));

    try {
      const result = await extractZip(zipData, tempDir);

      expect(result.success).toBe(true);
      expect(result.extracted_path).toBe(tempDir);
      expect(result.file_count).toBeGreaterThan(0);
      expect(result.total_size).toBeGreaterThan(0);

      // Verify SKILL.md can be found
      const skillRoot = await findSkillRoot(tempDir);
      expect(skillRoot).not.toBeNull();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should extract slack-gif-creator.zip successfully', async () => {
    const zipPath = join(TESTDATA_DIR, 'slack-gif-creator.zip');
    const zipData = await readFile(zipPath);
    const tempDir = await mkdtemp(join(tmpdir(), 'test-extract-'));

    try {
      const result = await extractZip(zipData, tempDir);

      expect(result.success).toBe(true);
      expect(result.file_count).toBeGreaterThan(0);

      // Verify SKILL.md can be found
      const skillRoot = await findSkillRoot(tempDir);
      expect(skillRoot).not.toBeNull();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('extractZip with invalid packages', () => {
  it('should reject invalid zip file', async () => {
    const notZipPath = join(TESTDATA_DIR, 'not-a-zip.txt');
    const notZipData = await readFile(notZipPath);
    const tempDir = await mkdtemp(join(tmpdir(), 'test-extract-'));

    try {
      const result = await extractZip(notZipData, tempDir);

      expect(result.success).toBe(false);
      // JSZip returns EXTRACTION_ERROR for invalid zip, which is acceptable
      expect(['INVALID_ZIP', 'EXTRACTION_ERROR']).toContain(result.error_code);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('SKILL.md validation with testdata', () => {
  it('should parse valid SKILL.md from brand-guidelines', async () => {
    const skillMdPath = join(TESTDATA_DIR, 'valid/brand-guidelines/SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter.name).toBeDefined();
    expect(result.frontmatter.description).toBeDefined();
  });

  it('should parse valid SKILL.md from slack-gif-creator', async () => {
    const skillMdPath = join(TESTDATA_DIR, 'valid/slack-gif-creator/SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter.name).toBeDefined();
    expect(result.frontmatter.description).toBeDefined();
  });

  it('should fail on invalid YAML frontmatter', async () => {
    const skillMdPath = join(TESTDATA_DIR, 'invalid/invalid-yaml/SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid YAML');
  });

  it('should detect missing name field', async () => {
    const skillMdPath = join(TESTDATA_DIR, 'invalid/missing-name/SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    const result = parseFrontmatter(content);

    // The frontmatter parses but name is missing
    expect(result.success).toBe(true);
    expect(result.frontmatter.name).toBeUndefined();
  });

  it('should detect missing description field', async () => {
    const skillMdPath = join(TESTDATA_DIR, 'invalid/missing-description/SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    const result = parseFrontmatter(content);

    // The frontmatter parses but description is missing
    expect(result.success).toBe(true);
    expect(result.frontmatter.description).toBeUndefined();
  });
});

describe('findSkillRoot', () => {
  it('should return null for directory without SKILL.md', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'test-no-skill-'));

    try {
      const result = await findSkillRoot(tempDir);
      expect(result).toBeNull();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

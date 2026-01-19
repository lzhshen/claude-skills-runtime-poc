/**
 * Skill validator tests to improve coverage.
 */

import { describe, it, expect } from 'vitest';
import { validateSkillMd, hasSkillMd, findSkillMdPath } from '../services/skill.validator.js';

describe('Skill Validator Tests', () => {
  describe('validateSkillMd', () => {
    it('should validate valid SKILL.md content', () => {
      const content = `---
name: Test Skill
description: A test skill description
---

Instructions for the skill.`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.name).toBe('Test Skill');
      expect(result.metadata!.description).toBe('A test skill description');
      expect(result.metadata!.instruction).toBe('Instructions for the skill.');
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for invalid YAML', () => {
      const content = `---
name: Test
invalid: yaml: syntax: here
---

Body content`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_YAML');
    });

    it('should return error for missing name', () => {
      const content = `---
description: A description
---

Body`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should return error for missing description', () => {
      const content = `---
name: Test Skill
---

Body`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_DESCRIPTION')).toBe(true);
    });

    it('should return multiple errors when both name and description are missing', () => {
      const content = `---
other_field: value
---

Body`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors.some((e) => e.code === 'MISSING_NAME')).toBe(true);
      expect(result.errors.some((e) => e.code === 'MISSING_DESCRIPTION')).toBe(true);
    });

    it('should extract extra fields', () => {
      const content = `---
name: Test
description: Desc
author: John Doe
version: 1.0.0
tags:
  - tag1
  - tag2
---

Body`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(true);
      expect(result.metadata!.extra_fields).toEqual({
        author: 'John Doe',
        version: '1.0.0',
        tags: ['tag1', 'tag2'],
      });
    });

    it('should handle empty body', () => {
      const content = `---
name: Test
description: Desc
---
`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(true);
      expect(result.metadata!.instruction).toBe('');
    });

    it('should preserve raw content', () => {
      const content = `---
name: Test
description: Desc
---

Body here`;

      const result = validateSkillMd(content);

      expect(result.isValid).toBe(true);
      expect(result.metadata!.raw_content).toBe(content);
    });
  });

  describe('hasSkillMd', () => {
    it('should return true when SKILL.md is in root', () => {
      expect(hasSkillMd(['SKILL.md', 'README.md'])).toBe(true);
    });

    it('should return true when SKILL.md is in subdirectory', () => {
      expect(hasSkillMd(['package/SKILL.md', 'README.md'])).toBe(true);
    });

    it('should return false when SKILL.md is not present', () => {
      expect(hasSkillMd(['README.md', 'index.js'])).toBe(false);
    });

    it('should return false for empty file list', () => {
      expect(hasSkillMd([])).toBe(false);
    });

    it('should not match partial names', () => {
      expect(hasSkillMd(['MY_SKILL.md', 'SKILL.md.bak'])).toBe(false);
    });
  });

  describe('findSkillMdPath', () => {
    it('should prefer root SKILL.md', () => {
      expect(findSkillMdPath(['folder/SKILL.md', 'SKILL.md'])).toBe('SKILL.md');
    });

    it('should find SKILL.md in subdirectory', () => {
      expect(findSkillMdPath(['package/SKILL.md', 'README.md'])).toBe('package/SKILL.md');
    });

    it('should return undefined when not found', () => {
      expect(findSkillMdPath(['README.md', 'index.js'])).toBeUndefined();
    });

    it('should return undefined for empty list', () => {
      expect(findSkillMdPath([])).toBeUndefined();
    });
  });
});

/**
 * SKILL.md validator service.
 */

import type { SkillMetadata, ValidationError, ErrorCode } from '@skills-runtime/shared';
import { parseFrontmatter } from '../utils/yaml-parser.js';

/**
 * Result of SKILL.md validation.
 */
export interface ValidationResult {
  isValid: boolean;
  metadata?: SkillMetadata;
  errors: ValidationError[];
}

/**
 * Validate SKILL.md content and extract metadata.
 *
 * @param content - Raw SKILL.md file content.
 * @returns ValidationResult with validation status and extracted metadata.
 */
export function validateSkillMd(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // Parse frontmatter
  const parseResult = parseFrontmatter(content);

  if (!parseResult.success) {
    errors.push({
      code: 'INVALID_YAML' as ErrorCode,
      message: `YAML parsing failed: ${parseResult.error}`,
      suggestion: 'Please check the YAML frontmatter format at the beginning of SKILL.md',
    });
    return { isValid: false, errors };
  }

  const frontmatter = parseResult.frontmatter;

  // Check required fields
  const name = frontmatter.name as string | undefined;
  const description = frontmatter.description as string | undefined;

  if (!name) {
    errors.push({
      code: 'MISSING_NAME' as ErrorCode,
      message: 'Missing required field: name',
      suggestion: "Please add a 'name' field to the YAML frontmatter",
      field: 'name',
    });
  }

  if (!description) {
    errors.push({
      code: 'MISSING_DESCRIPTION' as ErrorCode,
      message: 'Missing required field: description',
      suggestion: "Please add a 'description' field to the YAML frontmatter",
      field: 'description',
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Extract extra fields (everything except name and description)
  const extraFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key !== 'name' && key !== 'description') {
      extraFields[key] = value;
    }
  }

  // Create metadata
  const metadata: SkillMetadata = {
    name: String(name),
    description: String(description),
    raw_content: content,
    instruction: parseResult.body.trim(),
    extra_fields: extraFields,
  };

  return { isValid: true, metadata, errors: [] };
}

/**
 * Check if SKILL.md exists in file list.
 *
 * @param filePaths - List of file paths in the package.
 * @returns True if SKILL.md exists, false otherwise.
 */
export function hasSkillMd(filePaths: string[]): boolean {
  return filePaths.some((p) => p === 'SKILL.md' || p.endsWith('/SKILL.md'));
}

/**
 * Find SKILL.md path in file list.
 *
 * @param filePaths - List of file paths in the package.
 * @returns Path to SKILL.md if found, undefined otherwise.
 */
export function findSkillMdPath(filePaths: string[]): string | undefined {
  // Prefer root SKILL.md
  if (filePaths.includes('SKILL.md')) {
    return 'SKILL.md';
  }

  // Check for SKILL.md in subdirectory (e.g., when zip has a single root folder)
  return filePaths.find((p) => p.endsWith('/SKILL.md'));
}

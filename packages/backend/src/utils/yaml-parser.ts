/**
 * YAML frontmatter parser utility.
 */

import yaml from 'js-yaml';

/**
 * Result of frontmatter parsing.
 */
export interface FrontmatterResult {
  success: boolean;
  frontmatter: Record<string, unknown>;
  body: string;
  error?: string;
}

/**
 * Parse YAML frontmatter from markdown content.
 *
 * @param content - Markdown content with optional YAML frontmatter.
 * @returns FrontmatterResult with parsed frontmatter and body.
 */
export function parseFrontmatter(content: string): FrontmatterResult {
  const trimmedContent = content.trim();

  // Check for frontmatter delimiter
  if (!trimmedContent.startsWith('---')) {
    return {
      success: false,
      frontmatter: {},
      body: trimmedContent,
      error: "No frontmatter found - content must start with '---'",
    };
  }

  // Find the closing delimiter
  const lines = trimmedContent.split('\n');
  let endIndex = -1;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return {
      success: false,
      frontmatter: {},
      body: trimmedContent,
      error: 'No closing frontmatter delimiter found',
    };
  }

  // Extract frontmatter and body
  const frontmatterLines = lines.slice(1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);

  const frontmatterText = frontmatterLines.join('\n');
  const body = bodyLines.join('\n');

  // Parse YAML
  try {
    let frontmatter: Record<string, unknown> = {};

    if (frontmatterText.trim()) {
      const parsed = yaml.load(frontmatterText);
      if (parsed !== null && typeof parsed === 'object') {
        frontmatter = parsed as Record<string, unknown>;
      }
    }

    return {
      success: true,
      frontmatter,
      body,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      frontmatter: {},
      body,
      error: `Invalid YAML: ${error}`,
    };
  }
}

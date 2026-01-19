import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../utils/yaml-parser.js';

describe('parseFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
name: test-skill
description: A test skill
---

This is the body content.`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter).toEqual({
      name: 'test-skill',
      description: 'A test skill',
    });
    expect(result.body.trim()).toBe('This is the body content.');
    expect(result.error).toBeUndefined();
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---

Body content here.`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter).toEqual({});
    expect(result.body.trim()).toBe('Body content here.');
  });

  it('should fail when no frontmatter delimiter', () => {
    const content = 'Just some plain content without frontmatter.';

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    expect(result.error).toContain("must start with '---'");
  });

  it('should fail when no closing delimiter', () => {
    const content = `---
name: incomplete
description: Missing closing delimiter`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No closing frontmatter delimiter');
  });

  it('should fail on invalid YAML', () => {
    const content = `---
name: test
invalid: [unclosed bracket
---

Body content.`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid YAML');
  });

  it('should handle complex YAML values', () => {
    const content = `---
name: complex-skill
tags:
  - tag1
  - tag2
metadata:
  author: test
  version: 1.0.0
---

Complex body content.`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter.name).toBe('complex-skill');
    expect(result.frontmatter.tags).toEqual(['tag1', 'tag2']);
    expect(result.frontmatter.metadata).toEqual({
      author: 'test',
      version: '1.0.0',
    });
  });

  it('should handle whitespace around delimiters', () => {
    const content = `---
name: whitespace-test
---

Body with whitespace.`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.frontmatter.name).toBe('whitespace-test');
  });

  it('should preserve body content exactly', () => {
    const content = `---
name: preserve-body
---

Line 1
Line 2

Line 4 after empty line`;

    const result = parseFrontmatter(content);

    expect(result.success).toBe(true);
    expect(result.body).toContain('Line 1');
    expect(result.body).toContain('Line 2');
    expect(result.body).toContain('Line 4 after empty line');
  });
});

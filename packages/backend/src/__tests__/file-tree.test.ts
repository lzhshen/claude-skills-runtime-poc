import { describe, it, expect } from 'vitest';
import { buildFileTree, flattenFileTree } from '../utils/file-tree.js';
import type { SkillFile } from '@skills-runtime/shared';

describe('buildFileTree', () => {
  it('should build tree from flat list of files', () => {
    const files: SkillFile[] = [
      {
        path: 'SKILL.md',
        name: 'SKILL.md',
        file_type: 'markdown',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'abc123',
        is_binary: false,
      },
      {
        path: 'src/index.ts',
        name: 'index.ts',
        file_type: 'text',
        size_bytes: 200,
        is_modified: false,
        original_hash: 'def456',
        is_binary: false,
      },
      {
        path: 'src/utils/helper.ts',
        name: 'helper.ts',
        file_type: 'text',
        size_bytes: 150,
        is_modified: false,
        original_hash: 'ghi789',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);

    // Should have 2 root items: src directory and SKILL.md
    expect(tree.length).toBe(2);

    // Directories first
    expect(tree[0].name).toBe('src');
    expect(tree[0].file_type).toBe('directory');
    expect(tree[0].children).toBeDefined();
    expect(tree[0].children!.length).toBe(2);

    // SKILL.md second
    expect(tree[1].name).toBe('SKILL.md');
    expect(tree[1].file_type).toBe('markdown');
  });

  it('should sort directories before files', () => {
    const files: SkillFile[] = [
      {
        path: 'zebra.txt',
        name: 'zebra.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'abc',
        is_binary: false,
      },
      {
        path: 'alpha/file.txt',
        name: 'file.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'def',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);

    // Directory (alpha) should come before file (zebra.txt)
    expect(tree[0].name).toBe('alpha');
    expect(tree[1].name).toBe('zebra.txt');
  });

  it('should sort alphabetically within same type', () => {
    const files: SkillFile[] = [
      {
        path: 'c.txt',
        name: 'c.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'c',
        is_binary: false,
      },
      {
        path: 'a.txt',
        name: 'a.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'a',
        is_binary: false,
      },
      {
        path: 'b.txt',
        name: 'b.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'b',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);

    expect(tree[0].name).toBe('a.txt');
    expect(tree[1].name).toBe('b.txt');
    expect(tree[2].name).toBe('c.txt');
  });

  it('should handle empty file list', () => {
    const tree = buildFileTree([]);
    expect(tree).toEqual([]);
  });

  it('should handle deeply nested files', () => {
    const files: SkillFile[] = [
      {
        path: 'a/b/c/d/file.txt',
        name: 'file.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'deep',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);

    expect(tree.length).toBe(1);
    expect(tree[0].name).toBe('a');
    expect(tree[0].children![0].name).toBe('b');
    expect(tree[0].children![0].children![0].name).toBe('c');
    expect(tree[0].children![0].children![0].children![0].name).toBe('d');
    expect(tree[0].children![0].children![0].children![0].children![0].name).toBe('file.txt');
  });
});

describe('flattenFileTree', () => {
  it('should flatten tree back to list', () => {
    const files: SkillFile[] = [
      {
        path: 'SKILL.md',
        name: 'SKILL.md',
        file_type: 'markdown',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'abc123',
        is_binary: false,
      },
      {
        path: 'src/index.ts',
        name: 'index.ts',
        file_type: 'text',
        size_bytes: 200,
        is_modified: false,
        original_hash: 'def456',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);
    const flattened = flattenFileTree(tree);

    // Should have same number of files (directories excluded)
    expect(flattened.length).toBe(2);

    // Check that files are present
    const paths = flattened.map((f) => f.path);
    expect(paths).toContain('SKILL.md');
    expect(paths).toContain('src/index.ts');
  });

  it('should exclude directories from flattened list', () => {
    const files: SkillFile[] = [
      {
        path: 'dir/file.txt',
        name: 'file.txt',
        file_type: 'text',
        size_bytes: 100,
        is_modified: false,
        original_hash: 'abc',
        is_binary: false,
      },
    ];

    const tree = buildFileTree(files);
    const flattened = flattenFileTree(tree);

    // Only the file, not the directory
    expect(flattened.length).toBe(1);
    expect(flattened[0].path).toBe('dir/file.txt');
  });

  it('should handle empty tree', () => {
    const flattened = flattenFileTree([]);
    expect(flattened).toEqual([]);
  });
});

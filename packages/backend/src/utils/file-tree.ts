/**
 * File tree building utility.
 */

import type { SkillFile, FileType } from '@skills-runtime/shared';

/**
 * Represents a node in the file tree.
 */
export interface FileTreeNode {
  path: string;
  name: string;
  file_type: FileType;
  size_bytes?: number;
  is_binary?: boolean;
  is_modified?: boolean;
  original_hash?: string;
  children?: FileTreeNode[];
}

/**
 * Build a hierarchical file tree from a flat list of files.
 *
 * @param files - List of SkillFile objects.
 * @returns List of root-level FileTreeNode objects.
 */
export function buildFileTree(files: SkillFile[]): FileTreeNode[] {
  // Create a mapping of paths to nodes
  const nodes: Map<string, FileTreeNode> = new Map();
  const rootNodes: FileTreeNode[] = [];

  // Sort files by path to ensure parents are created before children
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');

    if (parts.length === 1) {
      // Root level file
      const node: FileTreeNode = {
        path: file.path,
        name: file.name,
        file_type: file.file_type,
        size_bytes: file.size_bytes,
        is_binary: file.is_binary,
        is_modified: file.is_modified,
        original_hash: file.original_hash,
      };
      nodes.set(file.path, node);
      rootNodes.push(node);
    } else {
      // File in subdirectory
      // Ensure all parent directories exist
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        if (!nodes.has(dirPath)) {
          const dirName = parts[i - 1];
          const dirNode: FileTreeNode = {
            path: dirPath,
            name: dirName,
            file_type: 'directory',
            children: [],
          };
          nodes.set(dirPath, dirNode);

          // Add to parent or root
          if (i === 1) {
            rootNodes.push(dirNode);
          } else {
            const parentPath = parts.slice(0, i - 1).join('/');
            const parentNode = nodes.get(parentPath);
            if (parentNode && parentNode.children) {
              parentNode.children.push(dirNode);
            }
          }
        }
      }

      // Create file node
      const fileNode: FileTreeNode = {
        path: file.path,
        name: file.name,
        file_type: file.file_type,
        size_bytes: file.size_bytes,
        is_binary: file.is_binary,
        is_modified: file.is_modified,
        original_hash: file.original_hash,
      };
      nodes.set(file.path, fileNode);

      // Add to parent directory
      const parentPath = parts.slice(0, -1).join('/');
      const parentNode = nodes.get(parentPath);
      if (parentNode && parentNode.children) {
        parentNode.children.push(fileNode);
      }
    }
  }

  // Sort children: directories first, then alphabetically
  function sortChildren(node: FileTreeNode): void {
    if (node.children) {
      node.children.sort((a, b) => {
        // Directories first
        if (a.file_type === 'directory' && b.file_type !== 'directory') {
          return -1;
        }
        if (a.file_type !== 'directory' && b.file_type === 'directory') {
          return 1;
        }
        // Then alphabetically
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      for (const child of node.children) {
        if (child.file_type === 'directory') {
          sortChildren(child);
        }
      }
    }
  }

  for (const node of rootNodes) {
    if (node.file_type === 'directory') {
      sortChildren(node);
    }
  }

  // Sort root nodes
  rootNodes.sort((a, b) => {
    // Directories first
    if (a.file_type === 'directory' && b.file_type !== 'directory') {
      return -1;
    }
    if (a.file_type !== 'directory' && b.file_type === 'directory') {
      return 1;
    }
    // Then alphabetically
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return rootNodes;
}

/**
 * Flatten a file tree back to a list of SkillFile objects.
 *
 * @param tree - List of root-level FileTreeNode objects.
 * @returns Flat list of SkillFile objects.
 */
export function flattenFileTree(tree: FileTreeNode[]): SkillFile[] {
  const files: SkillFile[] = [];

  function traverse(node: FileTreeNode): void {
    // Skip directories in the flat list (they're implicit)
    if (node.file_type !== 'directory') {
      files.push({
        path: node.path,
        name: node.name,
        file_type: node.file_type,
        size_bytes: node.size_bytes ?? 0,
        is_binary: node.is_binary ?? false,
        is_modified: node.is_modified ?? false,
        original_hash: node.original_hash ?? '',
      });
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of tree) {
    traverse(node);
  }

  return files;
}

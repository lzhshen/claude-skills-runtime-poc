/**
 * File utility functions.
 */

import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';

import type { FileType } from '@skills-runtime/shared';

// Binary file signatures (magic bytes)
const BINARY_SIGNATURES: Uint8Array[] = [
  new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG
  new Uint8Array([0xff, 0xd8, 0xff]), // JPEG
  new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
  new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // ZIP
  new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // ZIP (empty)
  new Uint8Array([0x1f, 0x8b]), // GZIP
  new Uint8Array([0x42, 0x5a]), // BZIP2
  new Uint8Array([0x7f, 0x45, 0x4c, 0x46]), // ELF executable
  new Uint8Array([0x4d, 0x5a]), // DOS/Windows executable
  new Uint8Array([0x00, 0x00, 0x01, 0x00]), // ICO
  new Uint8Array([0x00, 0x00, 0x02, 0x00]), // CUR
  new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF (WAV, AVI)
];

// Text file extensions
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.text',
  '.yaml',
  '.yml',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.sql',
  '.graphql',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.gitignore',
  '.dockerignore',
  '.editorconfig',
  '.prettierrc',
  '.eslintrc',
]);

/**
 * Check if content starts with a signature.
 */
function startsWithSignature(content: Uint8Array, signature: Uint8Array): boolean {
  if (content.length < signature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i++) {
    if (content[i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Detect if content is binary.
 *
 * @param filePath - Path to the file.
 * @param content - Optional file content bytes.
 * @returns True if file is binary, false if text.
 */
export function isBinaryContent(filePath: string, content?: Uint8Array): boolean {
  // Check extension first
  const ext = extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) {
    return false;
  }

  // If content provided, check magic bytes
  if (content) {
    for (const sig of BINARY_SIGNATURES) {
      if (startsWithSignature(content, sig)) {
        return true;
      }
    }

    // Check for null bytes (common in binary files)
    const sampleLength = Math.min(1024, content.length);
    for (let i = 0; i < sampleLength; i++) {
      if (content[i] === 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Detect if a file is binary by reading from disk.
 *
 * @param filePath - Path to the file.
 * @returns True if file is binary, false if text.
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  // Check extension first
  const ext = extname(filePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) {
    return false;
  }

  try {
    const buffer = await readFile(filePath);
    const sample = new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(1024, buffer.length));
    return isBinaryContent(filePath, sample);
  } catch {
    return true;
  }
}

/**
 * Determine the file type from path.
 *
 * @param filePath - Path to the file.
 * @param isDirectory - Whether the path is a directory.
 * @param content - Optional file content for binary detection.
 * @returns FileType value.
 */
export function getFileType(
  filePath: string,
  isDirectory: boolean = false,
  content?: Uint8Array
): FileType {
  if (isDirectory) {
    return 'directory';
  }

  const ext = extname(filePath).toLowerCase();

  if (ext === '.md' || ext === '.markdown') {
    return 'markdown';
  } else if (ext === '.yaml' || ext === '.yml') {
    return 'yaml';
  } else if (TEXT_EXTENSIONS.has(ext)) {
    return 'text';
  } else if (content && isBinaryContent(filePath, content)) {
    return 'binary';
  }

  return 'text';
}

/**
 * Compute MD5 hash of file content.
 *
 * @param content - File content bytes.
 * @returns Hexadecimal MD5 hash string.
 */
export function computeFileHash(content: Uint8Array | Buffer): string {
  return createHash('md5').update(content).digest('hex');
}

/**
 * Get file size in bytes.
 *
 * @param filePath - Path to the file.
 * @returns File size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

/**
 * Read text file content.
 *
 * @param filePath - Path to the file.
 * @param encoding - Text encoding.
 * @returns File content as string, or null if binary.
 */
export async function readTextFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string | null> {
  if (await isBinaryFile(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, { encoding });
    return content;
  } catch {
    return null;
  }
}

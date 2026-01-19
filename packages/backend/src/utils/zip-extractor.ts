/**
 * Zip extraction utility with security protections.
 */

import JSZip from 'jszip';
import { mkdir, writeFile, readdir, stat } from 'fs/promises';
import { join, dirname, isAbsolute, resolve } from 'path';
import { existsSync } from 'fs';

/**
 * Result of zip extraction.
 */
export interface ExtractionResult {
  success: boolean;
  extracted_path?: string;
  error_code?: string;
  error_message?: string;
  file_count: number;
  total_size: number;
}

/**
 * Check if extracted path is safe (no path traversal).
 */
export function isPathSafe(path: string, baseDir: string): boolean {
  // Normalize paths
  const absBase = resolve(baseDir);
  const absPath = resolve(join(baseDir, path));

  // Check if the path is within the base directory
  return absPath.startsWith(absBase + '/') || absPath === absBase;
}

/**
 * Extract zip file with security protections.
 *
 * @param zipData - Raw zip file bytes.
 * @param targetDir - Directory to extract to.
 * @param maxSizeBytes - Maximum total extracted size.
 * @param maxFiles - Maximum number of files to extract.
 * @param maxRatio - Maximum compression ratio (zip bomb protection).
 * @returns ExtractionResult with extraction status and details.
 */
export async function extractZip(
  zipData: Uint8Array | Buffer,
  targetDir: string,
  maxSizeBytes: number = 10 * 1024 * 1024, // 10MB default
  maxFiles: number = 1000,
  maxRatio: number = 10.0 // Compression ratio limit for zip bomb detection
): Promise<ExtractionResult> {
  try {
    const zipSize = zipData.length;
    const zip = await JSZip.loadAsync(zipData);

    const fileNames = Object.keys(zip.files);

    // Check for too many files
    if (fileNames.length > maxFiles) {
      return {
        success: false,
        error_code: 'ZIP_BOMB',
        error_message: `Too many files in archive (>${maxFiles})`,
        file_count: 0,
        total_size: 0,
      };
    }

    // Calculate total uncompressed size and check paths
    let totalSize = 0;
    for (const fileName of fileNames) {
      const file = zip.files[fileName];

      // Skip directories
      if (file.dir) {
        continue;
      }

      // Check for path traversal
      if (!isPathSafe(fileName, targetDir)) {
        return {
          success: false,
          error_code: 'PATH_TRAVERSAL',
          error_message: `Path traversal detected in: ${fileName}`,
          file_count: 0,
          total_size: 0,
        };
      }

      // Check for absolute paths
      if (isAbsolute(fileName)) {
        return {
          success: false,
          error_code: 'PATH_TRAVERSAL',
          error_message: `Absolute path in archive: ${fileName}`,
          file_count: 0,
          total_size: 0,
        };
      }

      // Get uncompressed size
      const content = await file.async('uint8array');
      totalSize += content.length;
    }

    // Check size limit
    if (totalSize > maxSizeBytes) {
      return {
        success: false,
        error_code: 'FILE_TOO_LARGE',
        error_message: `Extracted size (${totalSize} bytes) exceeds limit (${maxSizeBytes} bytes)`,
        file_count: 0,
        total_size: 0,
      };
    }

    // Check compression ratio (zip bomb protection)
    if (zipSize > 0 && totalSize / zipSize > maxRatio) {
      return {
        success: false,
        error_code: 'ZIP_BOMB',
        error_message: 'Suspicious compression ratio detected',
        file_count: 0,
        total_size: 0,
      };
    }

    // Create target directory if it doesn't exist
    await mkdir(targetDir, { recursive: true });

    // Extract all files
    let fileCount = 0;
    for (const fileName of fileNames) {
      const file = zip.files[fileName];

      // Skip directories
      if (file.dir) {
        continue;
      }

      // Extract file
      const targetPath = join(targetDir, fileName);
      const targetParent = dirname(targetPath);

      if (targetParent) {
        await mkdir(targetParent, { recursive: true });
      }

      const content = await file.async('uint8array');
      await writeFile(targetPath, content);

      fileCount++;
    }

    return {
      success: true,
      extracted_path: targetDir,
      file_count: fileCount,
      total_size: totalSize,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check for invalid zip
    if (message.includes('not a valid zip') || message.includes('End of Central Directory')) {
      return {
        success: false,
        error_code: 'INVALID_ZIP',
        error_message: 'Invalid or corrupted zip file',
        file_count: 0,
        total_size: 0,
      };
    }

    return {
      success: false,
      error_code: 'EXTRACTION_ERROR',
      error_message: message,
      file_count: 0,
      total_size: 0,
    };
  }
}

/**
 * Find the root directory containing SKILL.md.
 *
 * Handles cases where:
 * - SKILL.md is in the root
 * - SKILL.md is in a single top-level directory
 *
 * @param extractedDir - Directory where zip was extracted.
 * @returns Path to directory containing SKILL.md, or null if not found.
 */
export async function findSkillRoot(extractedDir: string): Promise<string | null> {
  // Check if SKILL.md is in the root
  if (existsSync(join(extractedDir, 'SKILL.md'))) {
    return extractedDir;
  }

  // Check for single top-level directory
  try {
    const entries = await readdir(extractedDir);
    if (entries.length === 1) {
      const singleDir = join(extractedDir, entries[0]);
      const stats = await stat(singleDir);
      if (stats.isDirectory()) {
        if (existsSync(join(singleDir, 'SKILL.md'))) {
          return singleDir;
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return null;
}

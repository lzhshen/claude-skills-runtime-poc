/**
 * Zip repacking utility for modified skill packages.
 */

import JSZip from 'jszip';
import type { SkillFile } from '@skills-runtime/shared';

/**
 * Extended SkillFile with optional binary content for repacking.
 */
export interface SkillFileWithContent extends SkillFile {
  binary_content?: Uint8Array;
}

/**
 * Repack skill files into a new zip archive.
 *
 * @param files - List of SkillFile objects from the original package.
 * @param modifiedContents - Map of file paths to their modified content.
 * @returns Bytes of the new zip archive.
 */
export async function repackSkillZip(
  files: SkillFileWithContent[],
  modifiedContents: Map<string, string>
): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const file of files) {
    // Skip directories - they're created implicitly
    if (file.file_type === 'directory') {
      continue;
    }

    // Use modified content if available, otherwise use original
    if (modifiedContents.has(file.path)) {
      const content = modifiedContents.get(file.path)!;
      // Write as text (UTF-8)
      zip.file(file.path, content);
    } else if (file.content !== undefined) {
      // Original text content
      zip.file(file.path, file.content);
    } else if (file.binary_content !== undefined) {
      // Original binary content
      zip.file(file.path, file.binary_content);
    }
    // Skip files with no content (shouldn't happen)
  }

  const zipContent = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipContent;
}

/**
 * Validate that all modified paths exist in the skill package.
 *
 * @param files - List of SkillFile objects from the package.
 * @param modifiedPaths - Set of file paths that have been modified.
 * @returns List of error messages (empty if valid).
 */
export function validateRepackRequest(
  files: SkillFile[],
  modifiedPaths: Set<string>
): string[] {
  const errors: string[] = [];
  const existingPaths = new Set(files.map((f) => f.path));

  for (const path of modifiedPaths) {
    if (!existingPaths.has(path)) {
      errors.push(`Modified file not found in package: ${path}`);
    }
  }

  return errors;
}

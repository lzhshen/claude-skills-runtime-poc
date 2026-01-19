/**
 * Skill package management service.
 */

import { readdir, readFile, writeFile, rm, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import type { SkillFile, SkillPackage, ValidationStatus, ValidationError } from '@skills-runtime/shared';
import { getSettings } from '../utils/config.js';
import { extractZip, findSkillRoot } from '../utils/zip-extractor.js';
import { isBinaryContent, getFileType, computeFileHash } from '../utils/file-utils.js';
import { validateSkillMd } from './skill.validator.js';
import { getSkillStorage, type StoredSkillPackage } from './skill.storage.js';

/**
 * Service for managing skill packages.
 */
export class SkillService {
  private storage = getSkillStorage();
  private settings = getSettings();

  /**
   * Get temporary directory for a package.
   */
  private getTempDir(packageId: string): string {
    return join(this.settings.tempDir, packageId);
  }

  /**
   * Scan directory and create SkillFile list.
   */
  private async scanFiles(
    directory: string,
    basePath: string = '',
    binaryContents: Map<string, Uint8Array> = new Map()
  ): Promise<SkillFile[]> {
    const files: SkillFile[] = [];
    const entries = await readdir(directory);

    for (const entry of entries.sort()) {
      const fullPath = join(directory, entry);
      const relPath = basePath ? join(basePath, entry) : entry;

      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectories
        const subFiles = await this.scanFiles(fullPath, relPath, binaryContents);
        files.push(...subFiles);
      } else {
        // Read file content
        const fileContent = await readFile(fullPath);
        const contentArray = new Uint8Array(fileContent);
        const isBinary = isBinaryContent(fullPath, contentArray);
        const fileType = getFileType(fullPath, false, contentArray);
        const fileHash = computeFileHash(fileContent);

        // Store binary content for repacking
        binaryContents.set(relPath, contentArray);

        // Read text content for text files
        let textContent: string | undefined;
        if (!isBinary) {
          try {
            textContent = fileContent.toString('utf-8');
          } catch {
            // Failed to decode as text
          }
        }

        files.push({
          path: relPath,
          name: entry,
          file_type: fileType,
          size_bytes: stats.size,
          content: textContent,
          is_modified: false,
          original_hash: fileHash,
          is_binary: isBinary,
        });
      }
    }

    return files;
  }

  /**
   * Upload and validate a skill package.
   */
  async uploadAndValidate(fileContent: Uint8Array | Buffer, filename: string): Promise<SkillPackage> {
    const packageId = uuidv4();
    const tempDir = this.getTempDir(packageId);

    // Create package with pending status
    const pkg: StoredSkillPackage = {
      id: packageId,
      original_filename: filename,
      extracted_path: tempDir,
      validation_status: 'pending' as ValidationStatus,
      validation_errors: [],
      files: [],
      uploaded_at: new Date().toISOString(),
      size_bytes: fileContent.length,
      binaryContents: new Map(),
      modifiedContents: new Map(),
    };

    // Extract zip
    const extractResult = await extractZip(
      fileContent,
      tempDir,
      this.settings.maxUploadSizeBytes
    );

    if (!extractResult.success) {
      const errorCode = extractResult.error_code || 'INVALID_ZIP';
      pkg.validation_status = 'invalid';
      pkg.validation_errors = [
        {
          code: errorCode as ValidationError['code'],
          message: extractResult.error_message || 'Extraction failed',
          suggestion: 'Please ensure you are uploading a valid zip file',
        },
      ];
      this.storage.save(pkg);
      return this.toSkillPackage(pkg);
    }

    // Find skill root (handles single top-level directory case)
    const skillRoot = await findSkillRoot(tempDir);

    if (skillRoot === null) {
      pkg.validation_status = 'invalid';
      pkg.validation_errors = [
        {
          code: 'MISSING_SKILL_MD',
          message: 'SKILL.md file is required',
          suggestion: 'Please ensure the zip package root or single top-level directory contains a SKILL.md file',
        },
      ];
      this.storage.save(pkg);
      return this.toSkillPackage(pkg);
    }

    // Update extracted path to skill root
    pkg.extracted_path = skillRoot;

    // Scan files
    const binaryContents = new Map<string, Uint8Array>();
    pkg.files = await this.scanFiles(skillRoot, '', binaryContents);
    pkg.binaryContents = binaryContents;

    // Read and validate SKILL.md
    const skillMdPath = join(skillRoot, 'SKILL.md');
    const skillMdContent = await readFile(skillMdPath, 'utf-8');
    const validationResult = validateSkillMd(skillMdContent);

    if (!validationResult.isValid) {
      pkg.validation_status = 'invalid';
      pkg.validation_errors = validationResult.errors;
    } else {
      pkg.validation_status = 'valid';
      pkg.metadata = validationResult.metadata;
    }

    this.storage.save(pkg);
    return this.toSkillPackage(pkg);
  }

  /**
   * Get a skill package by ID.
   */
  getPackage(packageId: string): SkillPackage | undefined {
    const pkg = this.storage.get(packageId);
    return pkg ? this.toSkillPackage(pkg) : undefined;
  }

  /**
   * Delete a skill package.
   */
  async deletePackage(packageId: string): Promise<boolean> {
    const pkg = this.storage.get(packageId);
    if (pkg) {
      // Clean up temp directory
      const tempDir = this.getTempDir(packageId);
      if (existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true });
      }

      return this.storage.delete(packageId);
    }
    return false;
  }

  /**
   * Get file content from a package.
   */
  getFileContent(packageId: string, filePath: string): SkillFile | undefined {
    const pkg = this.storage.get(packageId);
    if (!pkg) {
      return undefined;
    }

    // Find the file
    const file = pkg.files.find((f) => f.path === filePath);
    if (!file) {
      return undefined;
    }

    // If content not loaded and we have binary contents, load it
    if (file.content === undefined && !file.is_binary && pkg.binaryContents) {
      const binaryContent = pkg.binaryContents.get(filePath);
      if (binaryContent) {
        try {
          file.content = new TextDecoder().decode(binaryContent);
        } catch {
          // Failed to decode
        }
      }
    }

    // Check if there's modified content
    if (pkg.modifiedContents?.has(filePath)) {
      return {
        ...file,
        content: pkg.modifiedContents.get(filePath),
        is_modified: true,
      };
    }

    return file;
  }

  /**
   * Update file content in a package.
   */
  async updateFileContent(
    packageId: string,
    filePath: string,
    content: string
  ): Promise<SkillFile | undefined> {
    const pkg = this.storage.get(packageId);
    if (!pkg) {
      return undefined;
    }

    // Find the file
    const fileIndex = pkg.files.findIndex((f) => f.path === filePath);
    if (fileIndex === -1) {
      return undefined;
    }

    const file = pkg.files[fileIndex];
    if (file.is_binary) {
      return undefined; // Cannot edit binary files
    }

    // Write to disk
    const fullPath = join(pkg.extracted_path, filePath);
    await writeFile(fullPath, content, 'utf-8');

    // Update file object
    const updatedFile: SkillFile = {
      ...file,
      content,
      is_modified: true,
      size_bytes: Buffer.from(content, 'utf-8').length,
    };

    // Update in files array
    pkg.files[fileIndex] = updatedFile;

    // Track modified content
    if (!pkg.modifiedContents) {
      pkg.modifiedContents = new Map();
    }
    pkg.modifiedContents.set(filePath, content);

    // Save package
    this.storage.save(pkg);

    return updatedFile;
  }

  /**
   * Get file tree for a package.
   */
  getFileTree(packageId: string): SkillFile[] | undefined {
    const pkg = this.storage.get(packageId);
    if (!pkg) {
      return undefined;
    }
    return pkg.files;
  }

  /**
   * Convert stored package to public SkillPackage (without internal fields).
   */
  private toSkillPackage(pkg: StoredSkillPackage): SkillPackage {
    return {
      id: pkg.id,
      original_filename: pkg.original_filename,
      extracted_path: pkg.extracted_path,
      validation_status: pkg.validation_status,
      validation_errors: pkg.validation_errors,
      files: pkg.files,
      metadata: pkg.metadata,
      uploaded_at: pkg.uploaded_at,
      size_bytes: pkg.size_bytes,
    };
  }
}

// Global service instance
let service: SkillService | null = null;

/**
 * Get the global skill service instance.
 */
export function getSkillService(): SkillService {
  if (!service) {
    service = new SkillService();
  }
  return service;
}

/**
 * Reset the global skill service (for testing).
 */
export function resetSkillService(): void {
  service = null;
}

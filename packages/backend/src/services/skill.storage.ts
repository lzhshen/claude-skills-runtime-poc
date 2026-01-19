/**
 * In-memory skill package storage service.
 */

import type { SkillPackage } from '@skills-runtime/shared';

/**
 * Extended SkillPackage with binary content for in-memory storage.
 */
export interface StoredSkillPackage extends SkillPackage {
  /** Binary content of files for repacking */
  binaryContents?: Map<string, Uint8Array>;
  /** Modified text content of files */
  modifiedContents?: Map<string, string>;
}

/**
 * In-memory storage for skill packages.
 */
export class SkillStorage {
  private packages: Map<string, StoredSkillPackage> = new Map();

  /**
   * Save a skill package.
   *
   * @param pkg - SkillPackage to save.
   */
  save(pkg: StoredSkillPackage): void {
    this.packages.set(pkg.id, pkg);
  }

  /**
   * Get a skill package by ID.
   *
   * @param packageId - ID of the package to retrieve.
   * @returns SkillPackage if found, undefined otherwise.
   */
  get(packageId: string): StoredSkillPackage | undefined {
    return this.packages.get(packageId);
  }

  /**
   * Delete a skill package.
   *
   * @param packageId - ID of the package to delete.
   * @returns True if deleted, false if not found.
   */
  delete(packageId: string): boolean {
    return this.packages.delete(packageId);
  }

  /**
   * List all skill packages.
   *
   * @returns List of all stored skill packages.
   */
  listAll(): StoredSkillPackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * Clear all stored packages.
   */
  clear(): void {
    this.packages.clear();
  }

  /**
   * Check if a package exists.
   *
   * @param packageId - ID of the package to check.
   * @returns True if exists, false otherwise.
   */
  has(packageId: string): boolean {
    return this.packages.has(packageId);
  }

  /**
   * Get count of stored packages.
   */
  get count(): number {
    return this.packages.size;
  }
}

// Global storage instance
let storage: SkillStorage | null = null;

/**
 * Get the global skill storage instance.
 */
export function getSkillStorage(): SkillStorage {
  if (!storage) {
    storage = new SkillStorage();
  }
  return storage;
}

/**
 * Reset the global skill storage (for testing).
 */
export function resetSkillStorage(): void {
  storage = null;
}
